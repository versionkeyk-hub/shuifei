import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Clipboard, ExternalLink, FlaskConical, Info, Plus, Search, ShieldCheck } from 'lucide-react';
import { AppUser } from '../types';

type Pesticide = Record<string, any> & { component: string; category?: string };
type Product = Record<string, any> & { id: string; name: string };
type MixingResult = { product: Product; status: string; interval?: string; reason: string };

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(display).filter(Boolean).join('、');
  const labels: Record<string, string> = { chemical_class: '化学分类', category: '类别', problems: '解决问题', usage: '常见用法', precautions: '注意事项', contraindications: '使用禁忌', forbidden_crops: '禁用作物', restricted_crops: '限用作物', applicable_crops: '适用作物', applicable_stages: '适用时期', ph_diluted_250: 'pH（1:250倍稀释）', ph_general_use: '一般使用浓度 pH', ph_note: 'pH 说明', has_copper: '含铜', has_calcium: '含钙', has_phosphorus: '含磷', is_copper: '含铜制剂', is_fungicide: '杀菌剂', is_herbicide: '除草剂', no_alkali_mix: '禁与碱性物质混用', active_ingredient: '有效成分', registration: '登记信息', manufacturer: '生产厂家', brand: '品牌', crop: '作物', crops: '作物', timing: '使用时期', dosage: '用量', method: '使用方法', notes: '备注' };
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => { const child = display(item); return child ? (labels[key] || key.replace(/_/g, ' ')) + '：' + child : ''; }).filter(Boolean).join('\n');
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return value ? [display(value)] : [];
  return value.map(display).filter(Boolean);
}

function mixingNotes(flags: unknown): string[] {
  if (!flags || typeof flags !== 'object') return [];
  const source = flags as Record<string, unknown>;
  const notes: string[] = [];
  if (source.is_copper || source.is_inorganic_copper || source.is_organic_copper) notes.push('含铜制剂：避免与强酸、强碱及其他铜制剂直接混配。');
  if (source.is_fungicide) notes.push('杀菌剂：与微生物菌剂合用时建议错开 3—5 天。');
  if (source.is_herbicide) notes.push('除草剂：不建议与肥料或其他农药随意混配，严格按标签使用。');
  if (source.is_strong_acid) notes.push('强酸性：避免与碱性产品直接混配。');
  if (source.is_strong_base) notes.push('强碱性：避免与酸性产品直接混配。');
  if (source.no_alkali_mix) notes.push('标签提示：不得与碱性物质混用。');
  return notes;
}

function cropRestrictions(value: unknown): string {
  const text = display(value);
  const match = text.match(/【作物限制】([\\s\\S]*?)(?=【混配限制】|$)/);
  return match?.[1]?.trim() || text;
}

function statusClass(status: string): string {
  if (status === '禁混') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (status === '需谨慎') return 'border-yellow-200 bg-yellow-50 text-yellow-800';
  if (status === '需间隔' || status === '建议单用') return 'border-orange-200 bg-orange-50 text-orange-800';
  if (status === '可混但无必要') return 'border-slate-300 bg-slate-100 text-slate-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function badgeClass(status: string): string {
  if (status === '禁混') return 'bg-rose-600 text-white';
  if (status === '需谨慎') return 'bg-yellow-500 text-white';
  if (status === '需间隔' || status === '建议单用') return 'bg-orange-500 text-white';
  return 'bg-emerald-600 text-white';
}

const DetailBlock: React.FC<{ label: string; value: unknown; tone?: string }> = ({ label, value, tone = 'border-slate-200' }) => (
  display(value) ? <div className={'rounded-2xl border p-4 ' + tone}>
    <div className="text-base font-black tracking-wide text-slate-800">{label}</div>
    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{display(value)}</div>
  </div> : null
);

const ARCHIVE_KEYS = new Set(['component', 'extra', 'aliases', 'category', 'chemical_class', 'problems', 'usage', 'precautions', 'forbidden_crops', 'restricted_crops', 'related', 'brands', 'flags']);

export const NativePesticideMixingView: React.FC<{ currentUser?: AppUser | null }> = ({ currentUser }) => {
  const [pesticides, setPesticides] = useState<Pesticide[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [results, setResults] = useState<MixingResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [category, setCategory] = useState('全部');
  const [analysis, setAnalysis] = useState<{ prompt?: string; analysis?: unknown; message?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const detailRef = useRef<HTMLDivElement>(null);
  const canEdit = ['super_admin', 'admin'].includes(currentUser?.role || '');
  const authHeaders = useMemo(() => {
    const token = sessionStorage.getItem('hmht_api_token') || '';
    return token ? { authorization: 'Bearer ' + token } : {};
  }, [currentUser?.id]);

  const loadPesticides = () => {
    fetch('/api/native/pesticides?limit=10000', { headers: authHeaders })
      .then((response) => response.json())
      .then((payload: { pesticides?: Pesticide[] }) => setPesticides(payload.pesticides || []));
  };

  useEffect(() => { loadPesticides(); }, [authHeaders]);
  useEffect(() => { fetch('/api/native/products?limit=200', { headers: authHeaders }).then((response) => response.json()).then((payload: { products?: Product[] }) => setCatalogProducts(payload.products || [])).catch(() => undefined); }, [authHeaders]);
  useEffect(() => {
    const component = sessionStorage.getItem('hmht_pesticide_component');
    if (!component || !pesticides.some((item) => item.component === component)) return;
    sessionStorage.removeItem('hmht_pesticide_component');
    void choose(component);
  }, [pesticides]);

  const categories = useMemo(() => {
    const preferred = ['杀菌剂', '杀虫剂', '叶面肥', '肥料', '调节剂', '助剂', '杀螨剂', '杀线虫剂', '卫生杀虫剂', '杀软体动物剂', '杀鼠剂', '除草剂'];
    const available: string[] = Array.from(new Set(pesticides.map((item) => String(item.category || '未分类'))));
    return ['全部', ...preferred.filter((item) => available.includes(item)), ...available.filter((item) => !preferred.includes(item)).sort((left, right) => left.localeCompare(right, 'zh-CN'))];
  }, [pesticides]);
  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pesticides.filter((item) => (category === '全部' || (item.category || '未分类') === category) && (!needle || display(item).toLowerCase().includes(needle))).slice(0, 32);
  }, [pesticides, query, category]);

  const choose = async (component: string) => {
    setSelected(component);
    setMultiSelected((current) => current.includes(component) ? current : [...current, component]);
    setSelectedProduct(null);
    setLoading(true);
    try {
      const response = await fetch('/api/native/mixing?component=' + encodeURIComponent(component), { headers: authHeaders });
      const payload = await response.json() as { results?: MixingResult[] };
      setResults(payload.results || []);
    } finally {
      setLoading(false);
    }
  };

  const pesticide = pesticides.find((item) => item.component === selected);
  const counts = useMemo(() => results.reduce<Record<string, number>>((summary, item) => ({ ...summary, [item.status]: (summary[item.status] || 0) + 1 }), {}), [results]);
  const componentTags = tags(pesticide?.related?.length ? pesticide.related : pesticide?.component);
  const flagTags = Object.entries(pesticide?.flags || {}).filter(([, value]) => Boolean(value)).map(([key]) => key);
  const brands = Array.isArray(pesticide?.brands) ? pesticide.brands : [];
  const toggleMulti = (component: string) => setMultiSelected((current) => current.includes(component) ? current.filter((item) => item !== component) : [...current, component]);
  const toggleProduct = (productId: string) => setSelectedProductIds((current) => current.includes(productId) ? current.filter((item) => item !== productId) : [...current, productId]);
  useEffect(() => {
    if (selectedProduct) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedProduct]);
  const runAnalysis = async () => {
    const pesticideNames = multiSelected.length ? multiSelected : selected ? [selected] : [];
    const selectedProducts = catalogProducts.filter((product) => selectedProductIds.includes(product.id)).map((product) => ({ name: product.name, ingredients: product.ingredients || product.description || '成分资料未录入' }));
    if (!pesticideNames.length || !selectedProducts.length) { setMessage('请至少选择一个农药和一个公司产品后再分析。'); return; }
    const response = await fetch('/api/native/mixing/analyze', { method: 'POST', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ pesticides: pesticideNames, products: selectedProducts }) });
    const payload = await response.json() as { prompt?: string; analysis?: unknown; message?: string; error?: string };
    if (!response.ok) { setMessage(payload.error || '分析请求失败'); return; }
    setAnalysis(payload);
  };
  const copyAnalysisPrompt = async () => { if (analysis?.prompt) { await navigator.clipboard?.writeText(analysis.prompt); setMessage('混配分析提示词已复制。'); } };

  const selectedProductNames = catalogProducts.filter((product) => selectedProductIds.includes(product.id)).map((product) => product.name);
  const selectedPesticideNames = multiSelected.length ? multiSelected : selected ? [selected] : [];

  const savePesticide = async () => {
    if (!pesticide) return;
    try {
      const payload = JSON.parse(draft) as Record<string, unknown>;
      const response = await fetch('/api/admin/native/pesticides/' + encodeURIComponent(pesticide.component), { method: 'PATCH', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ payload }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || '农药档案保存失败');
      setEditing(false);
      setMessage('农药完整档案已保存。');
      loadPesticides();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '农药档案保存失败');
    }
  };

  const createPesticide = async () => {
    if (!canEdit) return;
    const component = window.prompt('请输入要新增的农药有效成分名称');
    if (!component?.trim()) return;
    const response = await fetch('/api/admin/native/pesticides', { method: 'POST', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ component: component.trim(), payload: { aliases: [], category: '', chemical_class: '', problems: '', usage: '', precautions: '', brands: [], related: [], flags: {} } }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error || '新增农药失败'); return; }
    setMessage('农药档案已新增，请在选中后编辑全部字段。');
    await loadPesticides();
    setSelected(component.trim());
  };

  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-lg md:p-8">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><FlaskConical className="h-4 w-4" />农药资料与产品混配规则</div>
      <h1 className="mt-3 text-2xl font-black md:text-3xl">产品混配性查询</h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">展示农药成分、别名、类别、化学分类、pH、禁忌、品牌及产品混配结果，并按规则给出可混（需小试）、需谨慎、需间隔、建议单用或禁混提示。</p>
      {canEdit && <button type="button" onClick={createPesticide} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"><Plus className="h-4 w-4" />新增农药档案</button>}
    </header>
    <div className="grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入成分、别名、品牌或类别" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ' + (category === item ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600')}>{item}</button>)}</div>
        <div className="mt-3 text-xs text-slate-500"><span>{pesticides.length.toLocaleString()} 条农药资料</span></div>
        <div className="mt-3 max-h-[calc(100vh-290px)] space-y-2 overflow-auto pr-1">{searchResults.map((item) => <div key={item.component} className={'flex items-center gap-2 rounded-2xl border p-3 transition ' + (selected === item.component ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300')}><input type="checkbox" checked={multiSelected.includes(item.component)} onChange={() => toggleMulti(item.component)} className="h-4 w-4 accent-emerald-600" /><button type="button" onClick={() => choose(item.component)} className="min-w-0 flex-1 text-left"><div className="font-bold text-slate-900">{item.component}</div><div className="mt-1 text-xs text-slate-500">{item.category || '未分类'}{item.chemical_class ? ' · ' + item.chemical_class : ''}</div></button><a href={'https://www.bing.com/search?q=' + encodeURIComponent(item.component)} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="搜一搜"><ExternalLink className="h-4 w-4" /></a></div>)}</div>
      </section>
      <section className="space-y-5" data-selected-pesticide={selected}>
        {multiSelected.length > 0 && <div className="sticky top-2 z-10 space-y-3">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/95 p-3 shadow-sm backdrop-blur"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-violet-900"><span>当前组合：</span>{selectedPesticideNames.length || selectedProductNames.length ? <>{selectedPesticideNames.map((name) => <span key={'p-' + name} className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">农药：{name}</span>)}{selectedProductNames.map((name) => <span key={'f-' + name} className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800">产品：{name}</span>)}</> : <span className="text-violet-500">尚未选择农药或产品</span>}<button type="button" onClick={() => { setMultiSelected([]); setSelectedProductIds([]); setAnalysis(null); }} className="ml-auto rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-violet-700">清空选择</button></div></div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-base font-black text-violet-900">多选组合 · 一键分析</div></div><button type="button" onClick={runAnalysis} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-violet-700">生成混配分析</button></div>{analysis && <div className="mt-3 space-y-2"><div className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 whitespace-pre-wrap">{analysis.analysis ? display(analysis.analysis) : analysis.message}</div>{analysis.prompt && <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded-xl bg-white p-3 text-[11px] leading-5 text-slate-600">{analysis.prompt}</pre><button type="button" onClick={copyAnalysisPrompt} className="rounded-lg bg-white p-2 text-violet-700" title="复制提示词"><Clipboard className="h-4 w-4" /></button></div>}</div>}</div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-black text-indigo-900">产品待选</div><p className="mt-1 text-xs text-indigo-700">先选择要参与分析的产品，不必先点击农药；选中的产品会进入上方当前组合。</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700">已选 {selectedProductIds.length} / {catalogProducts.length}</span></div><div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">{catalogProducts.map((product) => { const checked = selectedProductIds.includes(product.id); return <button type="button" key={product.id} aria-pressed={checked} onClick={() => toggleProduct(product.id)} className={'rounded-full border px-3 py-2 text-xs font-bold transition ' + (checked ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-indigo-200 bg-white text-indigo-800 hover:border-indigo-400 hover:bg-indigo-100')}><span className="mr-1">{checked ? '✓' : '+'}</span>{product.name}</button>; })}{!catalogProducts.length && <span className="text-xs text-indigo-600">产品资料加载中…</span>}</div></div>
          </div>}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          {pesticide ? <><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" />农药档案</div><h2 className="mt-2 text-2xl font-black text-slate-900">{pesticide.component}</h2><div className="mt-2 flex flex-wrap gap-2">{tags(pesticide.aliases).map((item) => <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">别名：{item}</span>)}</div></div><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">{pesticide.category}</span>{canEdit && <button type="button" onClick={() => { setDraft(JSON.stringify(pesticide, null, 2)); setEditing(true); }} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">编辑档案</button>}</div></div>
          {editing && <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><div className="mb-2 text-xs font-black text-indigo-800">JSON 属性编辑（别名、化学分类、禁忌、品牌、规则标签均可维护）</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} className="w-full rounded-xl border border-indigo-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800" /><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">取消</button><button type="button" onClick={savePesticide} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">保存档案</button></div></div>}
           <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><DetailBlock label="化学分类" value={pesticide.chemical_class} tone="border-indigo-100 bg-indigo-50/40" /><DetailBlock label="有效/复配成分" value={componentTags} tone="border-blue-100 bg-blue-50/40" /><DetailBlock label="pH（1:250倍稀释）" value={pesticide.extra?.ph_diluted_250} tone="border-amber-100 bg-amber-50/40" /><DetailBlock label="一般使用浓度 pH" value={pesticide.extra?.ph_general_use} tone="border-amber-100 bg-amber-50/40" /><DetailBlock label="解决问题" value={pesticide.problems} /><DetailBlock label="常见用法" value={pesticide.usage} /><DetailBlock label="注意事项" value={pesticide.precautions} /><DetailBlock label="禁用/限用作物" value={pesticide.extra?.forbidden_crops || pesticide.extra?.restricted_crops || pesticide.forbidden_crops || pesticide.restricted_crops || cropRestrictions(pesticide.extra?.contraindications)} tone="border-rose-100 bg-rose-50/40" /><DetailBlock label="使用禁忌" value={pesticide.extra?.contraindications} tone="border-rose-100 bg-rose-50/40" /><DetailBlock label="混配提醒" value={mixingNotes(pesticide.flags)} /><DetailBlock label="关联成分" value={pesticide.related} />{Object.entries(pesticide.extra || {}).filter(([key, value]) => !['component', 'ph', 'ph_diluted_250', 'ph_general_use', 'ph_note', 'contraindications'].includes(key) && display(value)).map(([key, value]) => <DetailBlock key={'extra-' + key} label={key.replace(/_/g, ' ')} value={value} />)}{Object.entries(pesticide).filter(([key, value]) => !ARCHIVE_KEYS.has(key) && display(value)).map(([key, value]) => <DetailBlock key={key} label={key.replace(/_/g, ' ')} value={value} />)}</div>
           {brands.length > 0 && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-black text-slate-500">品牌商品及厂家</div><div className="mt-2 grid gap-2 md:grid-cols-2">{brands.map((brand: any, index: number) => <div key={index} className="rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm"><span className="font-bold">{display(brand.name || brand)}</span>{brand.company && <span className="ml-2 text-xs text-slate-500">厂家：{brand.company}</span>}</div>)}</div></div>}
           </> : <div className="py-12 text-center text-sm text-slate-400"><Info className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3">选择农药后，这里显示其档案字段。</p></div>}
         </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-lg font-black text-slate-900"><AlertTriangle className="h-5 w-5 text-amber-500" />与产品的混配结果</div><p className="mt-1 text-xs text-slate-500">农药 pH 不区分账号；统一显示 1:250 倍稀释值和一般使用浓度参考值。</p></div>{loading && <span className="text-xs text-slate-500">计算中…</span>}</div>{pesticide && <><div className="mt-4 flex flex-wrap gap-2">{Object.entries(counts).map(([status, count]) => <span key={status} className={'rounded-full px-3 py-1.5 text-xs font-black ' + badgeClass(status)}>{status} {count}</span>)}</div><div className="mt-4 grid gap-3 md:grid-cols-2">{results.map((item) => <div key={item.product.id} className={'rounded-2xl border p-4 ' + statusClass(item.status)}><div className="flex items-start justify-between gap-2"><div><div className="font-bold">{item.product.name}</div><div className="mt-1 text-xs opacity-75">{item.product.category || '产品'} · pH {item.product.mix_profile?.ph || ''}</div></div><span className={'shrink-0 rounded-full px-2 py-1 text-xs font-black ' + badgeClass(item.status)}>{item.status}</span></div><div className="mt-3 text-xs leading-5">{item.reason}{item.interval ? '（建议间隔 ' + item.interval + '）' : ''}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedProduct(item.product)} className="rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-bold">产品属性</button>{canEdit && <RuleEditor productId={item.product.id} currentStatus={item.status} currentReason={item.reason} authHeaders={authHeaders} onSaved={() => choose(selected)} />}</div></div>)}</div></>}</div>
        {selectedProduct && <div ref={detailRef} className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm md:p-7"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold text-indigo-700">产品资料</div><h3 className="mt-1 text-xl font-black text-slate-900">{selectedProduct.name}</h3></div><button type="button" onClick={() => setSelectedProduct(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold">关闭</button></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><DetailBlock label="产品简介" value={selectedProduct.intro} /><DetailBlock label="主要成分" value={selectedProduct.ingredients} /><DetailBlock label="功能作用" value={selectedProduct.functions} /><DetailBlock label="使用方法" value={selectedProduct.usage} /><DetailBlock label="适用作物" value={selectedProduct.applicable_crops} /><DetailBlock label="混配特征" value={selectedProduct.mix_profile} /><DetailBlock label="价格参考" value={selectedProduct.price_range} /><DetailBlock label="厂家/销售商" value={[selectedProduct.manufacturer, selectedProduct.seller].filter(Boolean).join('\n')} /><DetailBlock label="规格" value={selectedProduct.specifications} /></div></div>}
      </section>
    </div>
    {message && <div className="fixed bottom-5 right-5 z-30 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg">{message}</div>}
  </div>;
};

const RuleEditor: React.FC<{ productId: string; currentStatus: string; currentReason: string; authHeaders: Record<string, string>; onSaved: () => void }> = ({ productId, currentStatus, currentReason, authHeaders, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus === '禁混' ? 'forbidden' : currentStatus === '需谨慎' ? 'caution' : currentStatus === '需间隔' ? 'separate' : currentStatus === '建议单用' ? 'alone' : currentStatus === '可混但无必要' ? 'unnecessary' : 'mixable');
  const [reason, setReason] = useState(currentReason);
  const save = async () => {
    const pesticide = document.querySelector('[data-selected-pesticide]')?.getAttribute('data-selected-pesticide') || '';
    if (!pesticide) return;
    const response = await fetch('/api/admin/native/products/' + encodeURIComponent(productId) + '/compatibility', { method: 'PATCH', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ pesticide_name: pesticide, status, reason }) });
    if (response.ok) { setOpen(false); onSaved(); }
  };
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-bold">编辑混配规则</button>;
  return <div className="basis-full rounded-xl border border-current/20 bg-white/80 p-3"><div className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_auto]"><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs"><option value="forbidden">禁混</option><option value="caution">需谨慎</option><option value="separate">需间隔</option><option value="alone">建议单用</option><option value="unnecessary">可混但无必要</option><option value="mixable">可混</option><option value="default">恢复自动规则</option></select><input value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs" placeholder="规则原因" /><button type="button" onClick={save} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">保存</button></div></div>;
};
