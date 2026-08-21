import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArchiveRestore,
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  ChevronDown,
  ChevronUp,
  Database,
  FileSearch,
  FlaskConical,
  KeyRound,
  PackageSearch,
  Search,
  ShieldCheck,
  Tags,
} from 'lucide-react';

export interface CatalogStats {
  products: number;
  skus: number;
  pesticides: number;
  products_with_legacy_images?: number;
  source?: 'api' | 'snapshot' | 'legacy';
}

interface ProductSku {
  id?: string;
  sku?: string;
  specification: string;
  unit?: string;
  inner_pack_count?: number | null;
  price?: number | null;
  price_tier?: string;
  product_type?: string;
  source_ref?: SourceReference;
}

interface SourceReference {
  file?: string;
  sheet?: string;
  row?: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  source_type?: 'own' | 'market';
  aliases?: string[];
  form?: string;
  usage?: string;
  plain_usage?: string;
  ingredients?: Record<string, string>;
  specifications?: ProductSku[];
  skus?: ProductSku[];
  source_refs?: SourceReference[];
  images?: string[];
  legacy_details?: { images?: string[]; category?: string; description?: string; registrations?: unknown[] };
  mix_flags?: Record<string, boolean>;
  needs_verification?: boolean | number;
}

interface Pesticide {
  component: string;
  aliases?: string[];
  category?: string;
  chemical_class?: string;
  problems?: string;
  usage?: string;
  precautions?: string;
  brands?: Array<{ name: string; company?: string }>;
  related?: string[];
  flags?: Record<string, boolean>;
}

interface MixingResult {
  product: { id?: string; name: string; brand?: string; mix_flags_json?: string; mix_flags?: Record<string, boolean> };
  status: string;
  interval: string;
  reason: string;
}

interface ImportAudit {
  source_name: string;
  imported_at: string;
  status: string;
  record_counts?: Record<string, number>;
}

interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at?: string;
  migrated_from?: string;
}

interface ProductLibraryViewProps {
  currentUser?: { role?: string } | null;
  initialMode?: 'catalog' | 'admin';
  onNavigateToCrops?: () => void;
  onStatsChange?: (stats: CatalogStats) => void;
}

const EMPTY_STATS: CatalogStats = { products: 43, skus: 320, pesticides: 74, products_with_legacy_images: 15, source: 'snapshot' };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function productSkus(product: CatalogProduct): ProductSku[] {
  return product.skus || product.specifications || [];
}

function productSearchText(product: CatalogProduct): string {
  return [
    product.name,
    product.brand,
    ...(product.aliases || []),
    product.form || '',
    product.usage || '',
    ...Object.values(product.ingredients || {}),
    ...productSkus(product).map((item) => item.specification + ' ' + (item.sku || '')),
  ].join(' ').toLowerCase();
}

function countLegacyImages(product: CatalogProduct): number {
  return (product.images || product.legacy_details?.images || []).length;
}

function basicMixing(pesticide: Pesticide, product: CatalogProduct): MixingResult {
  const flags = pesticide.flags || {};
  const productFlags = product.mix_flags || {};
  if (flags.is_copper || flags.is_heavy_metal || flags.is_herbicide || flags.is_strong_base || flags.is_strong_acid) {
    return {
      product,
      status: '禁混',
      interval: flags.is_strong_base || flags.is_strong_acid ? '至少7天' : '',
      reason: '该农药类别存在明确的高风险混配禁忌，应分开使用并以产品标签为准。',
    };
  }
  if (flags.is_fungicide && productFlags.is_microbial) {
    return { product, status: '需间隔', interval: '3-5天', reason: '杀菌剂可能影响微生物菌剂活性，建议分开施用。' };
  }
  if ((flags.has_calcium && productFlags.is_phosphorus) || (flags.has_phosphorus && productFlags.is_calcium)) {
    return { product, status: '需间隔', interval: '2-3天', reason: '钙、磷混配可能产生沉淀，建议间隔使用。' };
  }
  return { product, status: '待核验', interval: '', reason: '基础规则未发现明确禁忌；仍需以标签、水质和小范围试验为准。' };
}

function statusStyle(status: string): string {
  if (status === '禁混') return 'bg-rose-50 border-rose-200 text-rose-800';
  if (status === '需间隔') return 'bg-amber-50 border-amber-200 text-amber-800';
  return 'bg-slate-50 border-slate-200 text-slate-700';
}

export const ProductLibraryView: React.FC<ProductLibraryViewProps> = ({
  currentUser,
  initialMode = 'catalog',
  onNavigateToCrops,
  onStatsChange,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'mixing' | 'admin'>(initialMode === 'admin' ? 'admin' : 'catalog');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [pesticides, setPesticides] = useState<Pesticide[]>([]);
  const [stats, setStats] = useState<CatalogStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState('正在加载已审计产品资料…');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('全部品牌');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [expandedSku, setExpandedSku] = useState(false);
  const [selectedPesticide, setSelectedPesticide] = useState('');
  const [mixingResults, setMixingResults] = useState<MixingResult[]>([]);
  const [mixingLoading, setMixingLoading] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('hmht_api_token') || '');
  const [adminRole, setAdminRole] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [importAudits, setImportAudits] = useState<ImportAudit[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCurrent = true;

    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/products?limit=200');
        if (!response.ok) throw new Error('API unavailable');
        const payload = await response.json() as { products?: CatalogProduct[] };
        const pesticideResponse = await fetch('/api/pesticides?limit=200');
        const pesticidePayload = pesticideResponse.ok ? await pesticideResponse.json() as { pesticides?: Pesticide[] } : { pesticides: [] };
        const statsResponse = await fetch('/api/catalog/stats');
        const statsPayload = statsResponse.ok ? await statsResponse.json() as CatalogStats : null;
        if (!isCurrent) return;
        const nextProducts = asArray<CatalogProduct>(payload.products);
        const nextPesticides = asArray<Pesticide>(pesticidePayload.pesticides);
        const nextStats = { ...EMPTY_STATS, ...(statsPayload || {}), source: 'api' as const };
        setProducts(nextProducts);
        setPesticides(nextPesticides);
        setStats(nextStats);
        setLoadNotice('已连接 D1 产品主数据。');
        onStatsChange?.(nextStats);
      } catch {
        try {
          const [catalogResponse, mixingResponse] = await Promise.all([
            fetch('/data/product-catalog.json'),
            fetch('/data/legacy-mixing-catalog.json'),
          ]);
          if (!catalogResponse.ok || !mixingResponse.ok) throw new Error('Snapshot unavailable');
          const catalog = await catalogResponse.json() as { products?: CatalogProduct[] };
          const mixing = await mixingResponse.json() as { pesticides?: Pesticide[] };
          if (!isCurrent) return;
          const nextProducts = asArray<CatalogProduct>(catalog.products);
          const nextPesticides = asArray<Pesticide>(mixing.pesticides);
          const nextStats = {
            products: nextProducts.length,
            skus: nextProducts.reduce((sum, product) => sum + productSkus(product).length, 0),
            pesticides: nextPesticides.length,
            products_with_legacy_images: nextProducts.filter((product) => countLegacyImages(product) > 0).length,
            source: 'snapshot' as const,
          };
          setProducts(nextProducts);
          setPesticides(nextPesticides);
          setStats(nextStats);
          setLoadNotice('当前为已审计静态快照；D1 部署后会自动切换到云端数据。');
          onStatsChange?.(nextStats);
        } catch {
          if (!isCurrent) return;
          setLoadNotice('产品快照尚未准备完成，请先运行数据构建脚本。');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    loadCatalog();
    return () => { isCurrent = false; };
  }, [onStatsChange]);

  const brands = useMemo(() => ['全部品牌', ...Array.from(new Set(products.map((product) => product.brand))).sort()], [products]);
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const brandMatches = brandFilter === '全部品牌' || product.brand === brandFilter;
      return brandMatches && (!query || productSearchText(product).includes(query));
    });
  }, [brandFilter, products, searchQuery]);
  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id === selectedProductId) || filteredProducts[0] || products[0];
  }, [filteredProducts, products, selectedProductId]);
  const selectedPesticideData = useMemo(() => pesticides.find((item) => item.component === selectedPesticide) || pesticides[0], [pesticides, selectedPesticide]);

  const requestMixing = async (pesticide: Pesticide | undefined) => {
    if (!pesticide) return;
    setMixingLoading(true);
    setSelectedPesticide(pesticide.component);
    try {
      const response = await fetch('/api/mixing?component=' + encodeURIComponent(pesticide.component));
      if (!response.ok) throw new Error('API unavailable');
      const payload = await response.json() as { results?: MixingResult[] };
      setMixingResults(asArray<MixingResult>(payload.results));
    } catch {
      setMixingResults(products.map((product) => basicMixing(pesticide, product)));
    } finally {
      setMixingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mixing' && selectedPesticideData && mixingResults.length === 0) {
      requestMixing(selectedPesticideData);
    }
  }, [activeTab, selectedPesticideData?.component]);

  const loadAdminData = async (token: string, role: string) => {
    const headers = { authorization: 'Bearer ' + token };
    const auditResponse = await fetch('/api/admin/import-audits', { headers });
    const audits = await auditResponse.json() as { audits?: ImportAudit[]; error?: string };
    if (!auditResponse.ok) throw new Error(audits.error || '读取导入审计失败');
    setImportAudits(asArray<ImportAudit>(audits.audits));
    if (role === 'super_admin') {
      const usersResponse = await fetch('/api/admin/users', { headers });
      const usersPayload = await usersResponse.json() as { users?: AdminUser[]; error?: string };
      if (!usersResponse.ok) throw new Error(usersPayload.error || '读取用户列表失败');
      setAdminUsers(asArray<AdminUser>(usersPayload.users));
    } else {
      setAdminUsers([]);
    }
  };

  useEffect(() => {
    if (activeTab !== 'admin' || !adminToken || adminRole) return;
    let active = true;
    const restoreSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { headers: { authorization: 'Bearer ' + adminToken } });
        const payload = await response.json() as { user?: { role?: string }; error?: string };
        if (!response.ok || !payload.user?.role) throw new Error(payload.error || '云端会话失效');
        if (!active) return;
        setAdminRole(payload.user.role);
        await loadAdminData(adminToken, payload.user.role);
        if (active) setAdminMessage('已恢复当前 Cloudflare 管理会话。');
      } catch {
        if (!active) return;
        sessionStorage.removeItem('hmht_api_token');
        setAdminToken('');
        setAdminMessage('请使用具有后台权限的 Cloudflare 账号登录。');
      }
    };
    restoreSession();
    return () => { active = false; };
  }, [activeTab, adminRole, adminToken]);

  const signInAdmin = async () => {
    setAdminMessage('正在验证后台账号…');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const payload = await response.json() as { token?: string; error?: string; user?: { role?: string } };
      if (!response.ok || !payload.token || !payload.user?.role) throw new Error(payload.error || '登录失败');
      sessionStorage.setItem('hmht_api_token', payload.token);
      setAdminToken(payload.token);
      setAdminRole(payload.user.role);
      setAdminPassword('');
      await loadAdminData(payload.token, payload.user.role);
      setAdminMessage('后台已连接。所有用户权限、SKU 报价和导入记录都由 D1 统一管理。');
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : '登录失败');
    }
  };

  const updateCloudUser = async (user: AdminUser, patch: Pick<AdminUser, 'role' | 'status'>) => {
    if (!adminToken) return;
    setAdminMessage('正在更新「' + user.display_name + '」…');
    try {
      const response = await fetch('/api/admin/users/' + encodeURIComponent(user.id), {
        method: 'PATCH',
        headers: { authorization: 'Bearer ' + adminToken, 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || '用户更新失败');
      setAdminUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...patch } : item));
      setAdminMessage('用户角色和状态已更新，并写入审计日志。');
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : '用户更新失败');
    }
  };

  const updateSkuPrice = async (sku: ProductSku) => {
    if (!adminToken || !sku.id) return;
    const value = priceDrafts[sku.id] ?? String(sku.price ?? '');
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
      setAdminMessage('请输入有效的 SKU 报价。');
      return;
    }
    setAdminMessage('正在更新 SKU 报价…');
    try {
      const response = await fetch('/api/admin/skus/' + encodeURIComponent(sku.id), {
        method: 'PATCH',
        headers: { authorization: 'Bearer ' + adminToken, 'content-type': 'application/json' },
        body: JSON.stringify({ price, price_tier: '管理员报价' }),
      });
      const payload = await response.json() as { error?: string; sku?: { price: number; price_tier: string } };
      if (!response.ok || !payload.sku) throw new Error(payload.error || '报价更新失败');
      setProducts((current) => current.map((product) => ({
        ...product,
        skus: product.skus?.map((item) => item.id === sku.id ? { ...item, price: payload.sku!.price, price_tier: payload.sku!.price_tier } : item),
      })));
      setPriceDrafts((current) => ({ ...current, [sku.id!]: String(payload.sku!.price) }));
      setAdminMessage('SKU 报价已更新，并写入审计日志。');
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : '报价更新失败');
    }
  };

  const resetCloudUserPassword = async (user: AdminUser) => {
    if (!adminToken) return;
    const password = window.prompt(`为「${user.display_name}」设置新密码（8 至 256 位）：`);
    if (!password) return;
    if (password.length < 8) {
      setAdminMessage('新密码至少需要 8 位。');
      return;
    }
    setAdminMessage('正在重置密码…');
    try {
      const response = await fetch('/api/admin/users/' + encodeURIComponent(user.id) + '/password', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + adminToken, 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || '密码重置失败');
      setAdminMessage('密码已重置，用户现有的其他登录会话已失效。');
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : '密码重置失败');
    }
  };

  const effectiveSkus = selectedProduct ? productSkus(selectedProduct) : [];
  const visibleSkus = expandedSku ? effectiveSkus : effectiveSkus.slice(0, 8);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 overflow-hidden relative">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-emerald-200 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            可追溯产品主数据 · 不以演示价替代真实报价
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-black tracking-tight">农药混配与产品资料库</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">整合产品成分、用法、包装规格、报价、来源和农药混配规则，为施肥方案配置器提供统一前置数据。</p>
        </div>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '规范产品', value: stats.products, icon: Boxes, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'SKU / 规格报价', value: stats.skus, icon: Tags, color: 'text-indigo-700 bg-indigo-50' },
          { label: '农药有效成分', value: stats.pesticides, icon: FlaskConical, color: 'text-amber-700 bg-amber-50' },
          { label: '旧站产品图片已备案', value: stats.products_with_legacy_images || 0, icon: ArchiveRestore, color: 'text-rose-700 bg-rose-50' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{item.label}</span><span className={'p-2 rounded-xl ' + item.color}><Icon className="w-4 h-4" /></span></div>
              <div className="mt-3 text-2xl font-black text-slate-900">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 flex gap-2 items-start">
        <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{loadNotice}</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {[
          { id: 'catalog' as const, label: '产品与报价', icon: PackageSearch },
          { id: 'mixing' as const, label: '农药混配查询', icon: FlaskConical },
          { id: 'admin' as const, label: '后台迁移与审计', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={'px-4 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ' + (active ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-900')}><Icon className="w-4 h-4" />{tab.label}</button>;
        })}
      </div>

      {activeTab === 'catalog' && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] gap-5">
          <section className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <label className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索产品、成分、规格或 SKU" className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
                <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white outline-none focus:border-emerald-500">{brands.map((brand) => <option key={brand}>{brand}</option>)}</select>
              </div>
              <p className="text-xs text-slate-500">检索结果 {filteredProducts.length} 条；价格保留来源表格和价格档位，实际报价以客户/渠道授权为准。</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const active = selectedProduct?.id === product.id;
                const skus = productSkus(product);
                const lowestPrice = skus.map((item) => item.price).filter((price): price is number => typeof price === 'number').sort((left, right) => left - right)[0];
                return (
                  <button type="button" key={product.id} onClick={() => { setSelectedProductId(product.id); setExpandedSku(false); }} className={'text-left rounded-2xl border p-4 transition-all ' + (active ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-300')}>
                    <div className="flex items-start justify-between gap-2"><div><div className="font-black text-slate-900">{product.name}</div><div className="mt-1 text-xs text-slate-500">{product.brand} · {product.form || '资料待补充'}</div></div><span className={'text-[10px] rounded-full px-2 py-1 font-bold ' + (product.source_type === 'market' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>{product.source_type === 'market' ? '市场产品' : '自有产品'}</span></div>
                    <div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-500">{skus.length} 条规格 / 报价</span><span className="font-bold text-emerald-700">{typeof lowestPrice === 'number' ? '¥' + lowestPrice + ' 起' : '价格待核验'}</span></div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs h-fit lg:sticky lg:top-5">
            {selectedProduct ? <>
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold text-emerald-700">{selectedProduct.brand}</div><h3 className="text-xl font-black text-slate-900 mt-1">{selectedProduct.name}</h3></div><span className="rounded-full px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-700">{countLegacyImages(selectedProduct) > 0 ? '图片已备案' : '图片待补充'}</span></div>
              {selectedProduct.images?.[0] && <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="mt-4 h-44 w-full rounded-2xl border border-slate-100 bg-slate-50 object-contain p-2" loading="lazy" />}
              {selectedProduct.legacy_details?.description && <p className="mt-3 text-sm leading-relaxed text-slate-600">{selectedProduct.legacy_details.description}</p>}
              <div className="mt-5 space-y-2"><h4 className="font-bold text-sm text-slate-900 flex gap-2 items-center"><BookOpenCheck className="w-4 h-4 text-emerald-600" />使用方法</h4><p className="text-sm whitespace-pre-line leading-relaxed text-slate-700">{selectedProduct.usage || selectedProduct.plain_usage || '资料待补充；请以产品标签和登记信息为准。'}</p></div>
              <div className="mt-5 space-y-2"><h4 className="font-bold text-sm text-slate-900">成分与形态</h4><div className="space-y-2">{Object.entries(selectedProduct.ingredients || {}).filter(([key]) => !['使用方法', '形态用法', '规格和价格', '口语化使用方法'].includes(key)).map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-2.5"><div className="text-[11px] font-bold text-slate-500">{key}</div><div className="mt-1 text-xs whitespace-pre-line leading-relaxed text-slate-700">{value}</div></div>)}</div></div>
              <div className="mt-5"><div className="flex items-center justify-between"><h4 className="font-bold text-sm text-slate-900">SKU / 包装 / 报价</h4><span className="text-xs text-slate-500">{effectiveSkus.length} 条</span></div><div className="mt-2 space-y-2">{visibleSkus.map((sku, index) => <div key={(sku.id || sku.sku || sku.specification) + index} className="border border-slate-200 rounded-xl p-2.5 text-xs"><div className="flex justify-between gap-2"><span className="font-bold text-slate-800">{sku.specification}</span><span className="font-black text-emerald-700">{typeof sku.price === 'number' ? '¥' + sku.price : '待核验'}</span></div><div className="mt-1 text-slate-500">{[sku.sku, sku.unit, sku.inner_pack_count ? '内含 ' + sku.inner_pack_count + ' 小包装' : '', sku.price_tier, sku.product_type].filter(Boolean).join(' · ') || '规格资料待补充'}</div>{sku.source_ref?.file && <div className="mt-1 text-[10px] text-slate-400">来源：{sku.source_ref.file} / {sku.source_ref.sheet || '—'} / 第 {sku.source_ref.row || '—'} 行</div>}</div>)}</div>{effectiveSkus.length > 8 && <button type="button" onClick={() => setExpandedSku(!expandedSku)} className="mt-3 text-xs text-emerald-700 font-bold flex items-center gap-1">{expandedSku ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}{expandedSku ? '收起规格' : '查看全部规格'}</button>}</div>
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><AlertTriangle className="inline w-3.5 h-3.5 mr-1" />产品资料用于技术内部查询；使用方法、适用作物、混配和报价均以当批标签、登记证、渠道价格及现场农艺判断为准。</div>
            </> : <div className="text-sm text-slate-500">未找到产品资料。</div>}
          </aside>
        </div>
      )}

      {activeTab === 'mixing' && (
        <div className="space-y-5">
          <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-end gap-3"><label className="flex-1"><span className="block text-xs font-bold text-slate-600 mb-2">选择农药有效成分</span><select value={selectedPesticideData?.component || ''} onChange={(event) => { const item = pesticides.find((pesticide) => pesticide.component === event.target.value); requestMixing(item); }} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white outline-none focus:border-emerald-500">{pesticides.map((pesticide) => <option key={pesticide.component} value={pesticide.component}>{pesticide.component} · {pesticide.category}</option>)}</select></label><button type="button" onClick={() => requestMixing(selectedPesticideData)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2"><FlaskConical className="w-4 h-4" />查询混配</button></div>
            {selectedPesticideData && <div className="mt-4 grid md:grid-cols-3 gap-3 text-xs"><div><span className="text-slate-400">类别</span><div className="mt-1 font-bold">{selectedPesticideData.category || '—'} · {selectedPesticideData.chemical_class || '—'}</div></div><div><span className="text-slate-400">常见用法</span><div className="mt-1 font-bold">{selectedPesticideData.usage || '—'}</div></div><div><span className="text-slate-400">注意事项</span><div className="mt-1 font-bold leading-relaxed">{selectedPesticideData.precautions || '—'}</div></div></div>}
          </section>
          <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs"><div className="flex items-center justify-between"><h3 className="font-black text-slate-900">与产品库的混配判定</h3><span className="text-xs text-slate-500">{mixingLoading ? '计算中…' : mixingResults.length + ' 条结果'}</span></div><div className="mt-4 grid md:grid-cols-2 gap-3">{mixingResults.map((result) => <div key={result.product.id || result.product.name} className={'rounded-2xl border p-4 ' + statusStyle(result.status)}><div className="flex justify-between gap-2"><span className="font-black">{result.product.name}</span><span className="text-xs font-bold">{result.status}{result.interval ? ' · ' + result.interval : ''}</span></div><p className="mt-2 text-xs leading-relaxed">{result.reason}</p></div>)}</div><p className="mt-5 text-xs text-slate-500 leading-relaxed">说明：本工具仅整理已收录的基础规则，不替代标签、登记要求、混配试验和农艺师现场判断；“待核验”不等于可以直接混用。</p></section>
        </div>
      )}

      {activeTab === 'admin' && (
        <>
        <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-5">
          <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs"><h3 className="font-black text-slate-900 flex gap-2 items-center"><KeyRound className="w-4 h-4 text-emerald-600" />Cloudflare 后台认证</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">登录后可查看 D1 导入审计；部署时通过 Workers Secret 配置首个管理员，密码不会写入前端或 Git。</p><div className="mt-4 space-y-3"><input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} placeholder="后台账号" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /><input value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} type="password" placeholder="后台密码" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /><button type="button" onClick={signInAdmin} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-sm font-bold">验证并读取审计记录</button></div>{adminMessage && <p className="mt-3 text-xs text-slate-600">{adminMessage}</p>}{currentUser?.role === 'super_admin' && <p className="mt-3 text-[11px] text-emerald-700">当前综合平台本地角色为超级管理员；云端权限仍以 D1 登录会话为准。</p>}</section>
          <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs"><h3 className="font-black text-slate-900 flex gap-2 items-center"><FileSearch className="w-4 h-4 text-indigo-600" />迁移对账与恢复路径</h3><div className="mt-4 space-y-3 text-sm text-slate-700"><div className="rounded-xl bg-slate-50 p-3"><b>已完成的不可覆盖备份：</b>部署包文件哈希、在线静态文件哈希、旧 Supabase 的产品/农药扩展/用户快照。</div><div className="rounded-xl bg-slate-50 p-3"><b>浏览器本地数据限制：</b>旧后台的 localStorage 与 IndexedDB 图片只保存在原浏览器；请在旧后台执行“下载整个网站文件夹”并保存导出包，才能补齐本地新增图片与未同步内容。</div><div className="rounded-xl bg-slate-50 p-3"><b>Cloudflare 迁移后：</b>D1 保存产品、SKU、农药、用户和审计日志，R2 保存图片和导入原件；所有修改应新建审计记录，不覆盖原始导入。</div></div>{adminToken && <div className="mt-5"><h4 className="text-sm font-bold">云端导入审计</h4>{importAudits.length ? <div className="mt-2 space-y-2">{importAudits.map((audit, index) => <div key={audit.source_name + index} className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 text-xs"><div className="font-bold text-emerald-900">{audit.source_name} · {audit.status}</div><div className="mt-1 text-emerald-800">{audit.imported_at}</div><div className="mt-1 text-emerald-800">{Object.entries(audit.record_counts || {}).map(([key, value]) => key + ': ' + value).join(' · ')}</div></div>)}</div> : <p className="mt-2 text-xs text-slate-500">尚无云端审计记录，完成 D1 迁移后会显示。</p>}</div>}</section>
        </div>
        {adminToken && adminRole && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-900">SKU 报价维护</h3><p className="mt-1 text-xs text-slate-500">管理员修改后立即写入 D1，并保留审计日志。</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{adminRole === 'super_admin' ? '超级管理员' : '管理员'}</span></div>
              <select value={selectedProduct?.id || ''} onChange={(event) => setSelectedProductId(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                {products.filter((product) => productSkus(product).length > 0).map((product) => <option key={product.id} value={product.id}>{product.brand} · {product.name}（{productSkus(product).length} 条 SKU）</option>)}
              </select>
              <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                {effectiveSkus.map((sku, index) => <div key={(sku.id || sku.specification) + index} className="rounded-xl border border-slate-200 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-slate-800">{sku.specification}</span><span className="text-slate-400">{sku.price_tier || '标准价'}</span></div><div className="mt-2 flex gap-2"><input type="number" min="0" step="0.01" value={sku.id ? (priceDrafts[sku.id] ?? String(sku.price ?? '')) : ''} onChange={(event) => sku.id && setPriceDrafts((current) => ({ ...current, [sku.id!]: event.target.value }))} disabled={!sku.id} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm" /><button type="button" onClick={() => updateSkuPrice(sku)} disabled={!sku.id} className="rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">保存</button></div>{sku.source_ref?.file && <div className="mt-2 text-[10px] text-slate-400">来源：{sku.source_ref.file} / {sku.source_ref.sheet || '—'} / 第 {sku.source_ref.row || '—'} 行</div>}</div>)}
                {!effectiveSkus.length && <p className="py-5 text-center text-xs text-slate-400">请选择含 SKU 的产品。</p>}
              </div>
            </section>
            {adminRole === 'super_admin' && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"><div><h3 className="font-black text-slate-900">云端用户审核与权限</h3><p className="mt-1 text-xs text-slate-500">迁移用户与新注册申请都在 D1 中统一管理。</p></div><div className="mt-4 max-h-[31rem] space-y-2 overflow-y-auto">{adminUsers.map((user) => <div key={user.id} className="rounded-xl border border-slate-200 p-3 text-xs"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-bold text-slate-900">{user.display_name}</div><div className="mt-1 text-slate-400">@{user.username} · {user.created_at.slice(0, 10)}</div></div><button type="button" onClick={() => resetCloudUserPassword(user)} className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-700 hover:border-emerald-400 hover:text-emerald-700">重置密码</button></div><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-500">角色<select value={user.role} onChange={(event) => updateCloudUser(user, { role: event.target.value, status: user.status })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800"><option value="super_admin">超级管理员</option><option value="admin">管理员</option><option value="staff">销售人员</option><option value="dealer">经销商</option><option value="farmer">农户</option></select></label><label className="text-[10px] font-bold text-slate-500">状态<select value={user.status} onChange={(event) => updateCloudUser(user, { role: user.role, status: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800"><option value="pending">待审核</option><option value="approved">已批准</option><option value="rejected">已拒绝</option><option value="disabled">已停用</option></select></label></div></div>)}{!adminUsers.length && <p className="py-5 text-center text-xs text-slate-400">正在读取云端用户，或当前账号没有超级管理员权限。</p>}</div></section>}
          </div>
        )}
        </>
      )}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div className="text-sm"><b className="text-emerald-900">下一步：把真实 SKU 直接用于施肥方案。</b><span className="text-emerald-800"> 目标阶段配置器将只使用产品库的实际包装和价格，不再使用演示用默认报价。</span></div>{onNavigateToCrops && <button type="button" onClick={onNavigateToCrops} className="shrink-0 rounded-xl border border-emerald-300 bg-white text-emerald-800 px-3 py-2 text-xs font-bold">进入作物与施肥方案</button>}</div>
    </div>
  );
};
