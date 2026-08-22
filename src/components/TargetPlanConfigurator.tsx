import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Calculator, Check, ClipboardCopy, Database, FileText, Leaf,
  Package, Plus, Save, Target, Trash2,
} from 'lucide-react';
import { AppUser, Crop } from '../types';

type TargetTier = 'high' | 'middle' | 'low';
type DoseUnit = '包装/亩' | 'kg/亩' | 'L/亩' | 'g/亩' | 'ml/亩';

interface ProductSku {
  id: string;
  native?: boolean;
  specification: string;
  name?: string;
  capacity?: string;
  unit?: string;
  inner_pack_count?: number | null;
  price?: number | null;
  price_tier?: string;
  source_ref?: { file?: string; sheet?: string; row?: string };
}

interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  source_type?: 'own' | 'market';
  form?: string;
  usage?: string;
  plain_usage?: string;
  ingredients?: Record<string, string>;
  skus?: ProductSku[];
  specifications?: Omit<ProductSku, 'id'>[];
}

interface PlanItem {
  id: string;
  productId: string;
  skuId: string;
  dosePerMu: number | null;
  doseUnit: DoseUnit;
  quotedPrice: number | null;
}

interface TargetPlanConfiguratorProps {
  crop: Crop;
  currentUser: AppUser | null;
  onOpenFullCycle: () => void;
}

const TARGET_OPTIONS = ['保花保果', '促进根系生长', '果实膨大', '果实增甜', '改善着色', '补充钙硼'];
const TIER_META: Record<TargetTier, { label: string; detail: string; className: string }> = {
  high: { label: '高端配置', detail: '技术完整度和价值优先', className: 'border-rose-200 bg-rose-50 text-rose-800' },
  middle: { label: '中端配置', detail: '效果与投入平衡', className: 'border-sky-200 bg-sky-50 text-sky-800' },
  low: { label: '低端配置', detail: '保留关键投入并控制成本', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
};

function normalizeProducts(source: CatalogProduct[]): CatalogProduct[] {
  return source.map((product) => ({
    ...product,
    source_type: product.source_type || 'own',
    skus: (product.skus || product.specifications || []).map((sku, index) => ({
      ...sku,
      id: (sku as Partial<ProductSku>).id || `${product.id}-snapshot-${index}`,
      specification: sku.specification || sku.name || sku.capacity || '规格',
      native: Boolean((sku as Partial<ProductSku>).id),
    })),
  }));
}

function sourceLabel(sku: ProductSku): string {
  if (!sku.source_ref?.file) return '来源待补充';
  return [sku.source_ref.file, sku.source_ref.sheet, sku.source_ref.row ? `第 ${sku.source_ref.row} 行` : ''].filter(Boolean).join(' / ');
}

function priceLabel(price: number | null | undefined): string {
  return typeof price === 'number' ? `¥${price}` : '报价待核验';
}

export const TargetPlanConfigurator: React.FC<TargetPlanConfiguratorProps> = ({ crop, currentUser, onOpenFullCycle }) => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState('正在连接产品主数据…');
  const [target, setTarget] = useState(TARGET_OPTIONS[0]);
  const [tier, setTier] = useState<TargetTier>('middle');
  const [area, setArea] = useState(15);
  const [usageCount, setUsageCount] = useState(3);
  const [interval, setInterval] = useState('7-10天/次');
  const [items, setItems] = useState<PlanItem[]>([]);
  const [search, setSearch] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/native/products?limit=200');
        if (!response.ok) throw new Error('D1 API unavailable');
        const payload = await response.json() as { products?: CatalogProduct[] };
        if (!active) return;
        setProducts(normalizeProducts(payload.products || []));
        setCatalogNotice('已连接 D1 真实产品、SKU 与来源报价。');
      } catch {
        try {
          const response = await fetch('/data/product-catalog.json');
          if (!response.ok) throw new Error('Snapshot unavailable');
          const payload = await response.json() as { products?: CatalogProduct[] };
          if (!active) return;
          setProducts(normalizeProducts(payload.products || []));
          setCatalogNotice('当前为已审计静态快照；部署后会自动切换到 D1 数据。');
        } catch {
          if (active) setCatalogNotice('产品资料暂时不可用，请稍后重试。');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCatalog();
    return () => { active = false; };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => [
      product.name, product.brand, product.form || '', product.usage || '',
      ...Object.values(product.ingredients || {}),
      ...(product.skus || []).map((sku) => sku.specification),
    ].join(' ').toLowerCase().includes(query));
  }, [products, search]);

  const rows = useMemo(() => items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const sku = product?.skus?.find((candidate) => candidate.id === item.skuId);
    const packageQuantity = item.doseUnit === '包装/亩' && item.dosePerMu !== null
      ? area * item.dosePerMu * usageCount
      : null;
    const price = item.quotedPrice ?? sku?.price ?? null;
    const subtotal = packageQuantity !== null && price !== null ? packageQuantity * price : null;
    return { item, product, sku, price, packageQuantity, subtotal };
  }), [area, items, products, usageCount]);

  const calculatedRows = rows.filter((row) => row.subtotal !== null);
  const stageCost = calculatedRows.reduce((sum, row) => sum + (row.subtotal || 0), 0);
  const isCompleteCalculation = rows.length > 0 && calculatedRows.length === rows.length;
  const generatedDescription = description || `${crop.name}当前以“${target}”为目标，采用${TIER_META[tier].label}草稿组合。已选产品、使用次数和报价均需结合田间情况、产品标签及渠道价格复核后再对外使用。`;

  const addProduct = (product: CatalogProduct) => {
    const sku = product.skus?.[0];
    setItems((current) => [...current, {
      id: crypto.randomUUID(),
      productId: product.id,
      skuId: sku?.id || '',
      dosePerMu: null,
      doseUnit: '包装/亩',
      quotedPrice: sku?.price ?? null,
    }]);
  };

  const updateItem = (itemId: string, patch: Partial<PlanItem>) => {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item));
  };

  const selectSku = (item: PlanItem, skuId: string) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const sku = product?.skus?.find((candidate) => candidate.id === skuId);
    updateItem(item.id, { skuId, quotedPrice: sku?.price ?? null });
  };

  const savePlan = async () => {
    const payload = {
      crop_name: crop.name, target, tier, area, usage_count: usageCount, usage_interval: interval,
      description: generatedDescription,
      items: rows.map((row) => ({
        product_id: row.product?.id || '', product_name: row.product?.name || '资料待补充',
        product_sku_id: row.sku?.native ? '' : row.sku?.id || '',
        native_product_id: row.sku?.native ? row.product?.id || '' : '',
        native_specification_id: row.sku?.native ? row.sku?.id || '' : '',
        specification: row.sku?.specification || '',
        dose_per_mu: row.item.dosePerMu, dose_unit: row.item.doseUnit, quoted_price: row.price,
      })),
    };
    const token = sessionStorage.getItem('hmht_api_token');
    if (token) {
      try {
        const response = await fetch('/api/plans', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || '云端保存失败');
        setMessage('方案已保存到 Cloudflare D1 的“我的方案”。');
        return;
      } catch (error) {
        setMessage(`${error instanceof Error ? error.message : '云端保存失败'}；已保存本机草稿。`);
      }
    }
    const drafts = JSON.parse(localStorage.getItem('hmht_target_plan_drafts') || '[]');
    localStorage.setItem('hmht_target_plan_drafts', JSON.stringify([{ ...payload, saved_at: new Date().toISOString(), author: currentUser?.realName || '未登录用户' }, ...drafts].slice(0, 30)));
    if (!token) setMessage('已保存本机草稿。登录 Cloudflare 后台后可同步到 D1。');
  };

  const copyPlan = async () => {
    const productLines = rows.map((row) => `- ${row.product?.name || '资料待补充'} ${row.sku?.specification || ''}：${row.item.dosePerMu ?? '待填写'}${row.item.doseUnit}，${priceLabel(row.price)}`).join('\n');
    const text = `${crop.name}${target}施肥方案（${TIER_META[tier].label}草稿）\n适用面积：${area}亩\n使用次数：${usageCount}次\n使用间隔：${interval}\n${productLines}\n阶段成本：${isCompleteCalculation ? `¥${stageCost.toFixed(2)}` : '待核验'}\n说明：${generatedDescription}`;
    await navigator.clipboard?.writeText(text);
    setMessage('方案摘要已复制；请在对外发送前复核用量、价格与标签。');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-5 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-200"><Target className="h-4 w-4" />目标阶段 / 目标问题方案</div>
            <h2 className="text-xl font-black md:text-2xl">{crop.name} · 施肥方案配置与报价</h2>
            <p className="mt-2 max-w-2xl text-xs text-emerald-100/80">本页直接读取产品资料库中的真实 SKU、规格、价格与资料来源。没有被资料确认的亩用量和官方方案不会自动编造。</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onOpenFullCycle} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">查看全周期</button>
            <button type="button" onClick={copyPlan} className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><ClipboardCopy className="h-4 w-4" />复制</button>
            <button type="button" onClick={savePlan} className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-300"><Save className="h-4 w-4" />保存</button>
          </div>
        </div>
      </section>

      <div className="flex gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900"><Database className="mt-0.5 h-4 w-4 shrink-0" />{catalogNotice}</div>
      {message && <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><Check className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-700" /><h3 className="font-black text-slate-900">方案定位</h3></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-bold text-slate-600">当前目标 / 问题<select value={target} onChange={(event) => setTarget(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400">{TARGET_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">推荐使用次数<input type="number" min="1" value={usageCount} onChange={(event) => setUsageCount(Math.max(1, Number(event.target.value) || 1))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" /></label>
          <label className="text-xs font-bold text-slate-600">使用间隔<input value={interval} onChange={(event) => setInterval(event.target.value)} placeholder="例如 7-10天/次" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" /></label>
        </div>
        <div className="grid gap-2 md:grid-cols-3">{(Object.keys(TIER_META) as TargetTier[]).map((option) => {
          const active = tier === option;
          const meta = TIER_META[option];
          return <button key={option} type="button" onClick={() => setTier(option)} className={`rounded-2xl border p-3 text-left transition ${active ? meta.className : 'border-slate-200 hover:border-emerald-200'}`}><div className="text-sm font-black">{meta.label}</div><div className="mt-1 text-[10px] text-slate-500">{meta.detail}</div></button>;
        })}</div>
        <p className="text-[11px] leading-relaxed text-amber-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />当前尚未录入经过技术审核的官方高/中/低配方；这里保存的是销售人员草稿，不能把等级理解为自动换产品或自动打折。</p>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-black">产品组合与真实 SKU</h3></div><span className="text-[10px] text-slate-400">自有产品与市场产品分色</span></div>
            {!items.length && <div className="p-8 text-center text-sm text-slate-400">从下方产品库添加产品后，再选择具体规格、填写已确认的单亩用量。</div>}
            <div className="divide-y divide-slate-100">{rows.map((row) => {
              const sourceType = row.product?.source_type === 'market' ? '市场产品' : '自有产品';
              const sourceClass = row.product?.source_type === 'market' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700';
              return <div key={row.item.id} className="p-4">
                <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-slate-900">{row.product?.name || '产品资料待补充'}</span><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${sourceClass}`}>{sourceType}</span></div><p className="mt-1 text-[11px] text-slate-500">{row.product?.brand || '—'} · {row.product?.usage || row.product?.plain_usage || '使用资料待补充，请以标签为准。'}</p></div><button type="button" onClick={() => setItems((current) => current.filter((item) => item.id !== row.item.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="移除产品"><Trash2 className="h-4 w-4" /></button></div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <label className="text-[10px] font-bold text-slate-500">具体 SKU<select value={row.item.skuId} onChange={(event) => selectSku(row.item, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800"><option value="">请选择规格</option>{(row.product?.skus || []).map((sku) => <option key={sku.id} value={sku.id}>{sku.specification} · {priceLabel(sku.price)}</option>)}</select></label>
                  <label className="text-[10px] font-bold text-slate-500">单亩每次用量<input type="number" min="0" step="0.01" value={row.item.dosePerMu ?? ''} onChange={(event) => updateItem(row.item.id, { dosePerMu: event.target.value === '' ? null : Number(event.target.value) })} placeholder="待确认" className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                  <label className="text-[10px] font-bold text-slate-500">用量单位<select value={row.item.doseUnit} onChange={(event) => updateItem(row.item.id, { doseUnit: event.target.value as DoseUnit })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800">{(['包装/亩', 'kg/亩', 'L/亩', 'g/亩', 'ml/亩'] as DoseUnit[]).map((unit) => <option key={unit}>{unit}</option>)}</select></label>
                  <label className="text-[10px] font-bold text-slate-500">本次报价<input type="number" min="0" step="0.01" value={row.price ?? ''} onChange={(event) => updateItem(row.item.id, { quotedPrice: event.target.value === '' ? null : Number(event.target.value) })} placeholder="待核验" className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800" /></label>
                </div>
                <div className="mt-3 grid gap-2 text-[11px] text-slate-500 md:grid-cols-3"><span>包装：{row.sku?.specification || '待选择'}</span><span>来源：{row.sku ? sourceLabel(row.sku) : '待选择 SKU'}</span><span className="font-bold text-slate-800">{row.packageQuantity !== null ? `阶段需 ${row.packageQuantity.toFixed(2)} 包装单位` : '非“包装/亩”用量需补包装换算后核算成本'}</span></div>
              </div>;
            })}</div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-700" /><h3 className="font-black text-slate-900">从产品资料库添加</h3></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索产品、成分、规格或品牌" className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto md:grid-cols-2">{filteredProducts.map((product) => <button type="button" key={product.id} onClick={() => addProduct(product)} className="rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-300 hover:bg-emerald-50"><div className="flex items-start justify-between gap-2"><span className="text-sm font-bold text-slate-900">{product.name}</span><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${product.source_type === 'market' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{product.source_type === 'market' ? '市场' : '自有'}</span></div><p className="mt-1 text-[11px] text-slate-500">{product.brand} · {product.skus?.length || 0} 条 SKU</p></button>)}</div>
            {!loading && !filteredProducts.length && <p className="mt-4 text-xs text-slate-400">未找到匹配产品。</p>}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5">
          <section className="space-y-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-black">方案核算</h3></div>
            <label className="block text-xs font-bold text-slate-600">适用面积（亩）<input type="number" min="0.1" step="0.5" value={area} onChange={(event) => setArea(Math.max(0.1, Number(event.target.value) || 0.1))} className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-lg font-black text-emerald-900 outline-none" /></label>
            <div className="space-y-3 border-t border-slate-100 pt-3 text-xs"><div className="flex justify-between"><span className="text-slate-500">已选产品</span><strong>{rows.length} 个</strong></div><div className="flex justify-between"><span className="text-slate-500">可核算产品</span><strong>{calculatedRows.length} / {rows.length}</strong></div><div className="flex justify-between"><span className="text-slate-500">阶段总成本</span><strong className="text-base text-orange-600">{isCompleteCalculation ? `¥${stageCost.toFixed(2)}` : '待核验'}</strong></div><div className="flex justify-between"><span className="text-slate-500">平均每亩成本</span><strong>{isCompleteCalculation ? `¥${(stageCost / area).toFixed(2)}/亩` : '待核验'}</strong></div></div>
            <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">只有选择真实 SKU、填写价格，并把单亩用量确认成“包装/亩”时，系统才会计算成本；其他单位必须先由技术人员确认包装换算关系。</p>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-black">方案描述</h3></div><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={generatedDescription} rows={6} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed outline-none focus:border-emerald-400" /><p className="mt-2 text-[11px] text-slate-400">默认描述由目标、等级和复核原则组成；可按田间实际情况调整。</p></section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-xs"><div className="flex items-center gap-2 font-black text-slate-900"><Leaf className="h-4 w-4 text-emerald-700" />农业处方边界</div><p className="mt-2 leading-relaxed">此草稿用于内部技术配置和报价准备，不替代肥料标签、登记信息、混配试验或现场农艺判断。</p></section>
        </aside>
      </div>
    </div>
  );
};
