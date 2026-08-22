import React, { useEffect, useMemo, useState } from 'react';
import { Database, Edit3, Image as ImageIcon, Package, Search, ShieldCheck, Tags, Trash2 } from 'lucide-react';
import { AppUser } from '../types';

type Specification = { id?: string; name?: string; capacity?: string; form?: string; payload?: Record<string, unknown> };
type Product = Record<string, any> & { id: string; name: string; category?: string; specifications?: Specification[]; images?: string[] };

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(display).filter(Boolean).join('、');
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => key + '：' + display(item)).join('\n');
}

function imageUrl(value: string): string {
  if (value.startsWith('http') || value.startsWith('/')) return value;
  return '/legacy-pesticide/' + value;
}

const Field: React.FC<{ label: string; value: unknown; tone?: string }> = ({ label, value, tone = 'border-slate-200 bg-white' }) => (
  <div className={'rounded-2xl border p-4 ' + tone}><div className="text-xs font-black tracking-wide text-slate-500">{label}</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{display(value) || '暂无资料'}</div></div>
);

export const NativeProductCatalogView: React.FC<{ currentUser?: AppUser | null }> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [category, setCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const canEdit = ['super_admin', 'admin'].includes(currentUser?.role || '');
  const authHeaders = useMemo(() => {
    const token = sessionStorage.getItem('hmht_api_token') || '';
    return token ? { authorization: 'Bearer ' + token } : {};
  }, [currentUser?.id]);
  const loadProducts = () => {
    setLoading(true);
    fetch('/api/native/products?limit=200', { headers: authHeaders }).then((response) => response.json()).then((payload: { products?: Product[] }) => setProducts(payload.products || [])).finally(() => setLoading(false));
  };
  useEffect(() => { loadProducts(); }, [authHeaders]);
  const categories = useMemo(() => ['全部', ...Array.from(new Set(products.map((product) => product.category || '未分类'))).sort()], [products]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => (category === '全部' || (product.category || '未分类') === category) && (!needle || display(product).toLowerCase().includes(needle)));
  }, [products, query, category]);
  const selected = products.find((product) => product.id === selectedId) || filtered[0] || products[0];
  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 p-6 text-white shadow-lg md:p-8"><div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><Database className="h-4 w-4" />总站产品主数据 · 原版资料完整迁移</div><h1 className="mt-3 text-2xl font-black md:text-3xl">产品信息库</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">按产品类别浏览卡片，进入后直接查看图片、简介、成分、登记、规格、用法、适用作物、混配特征、价格和自定义字段。该资料库是后续施肥方案的统一产品参数来源。</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{products.length} 个产品</span><span className="rounded-full bg-white/10 px-3 py-1.5">{products.reduce((sum, product) => sum + (product.specifications || []).length, 0)} 个包装规格</span><span className="rounded-full bg-white/10 px-3 py-1.5">支持管理员维护</span></div></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={'rounded-full px-3 py-2 text-xs font-bold transition ' + (category === item ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50')}>{item}</button>)}</div><label className="relative block lg:w-80"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索产品、成分、规格、厂家" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label></div></section>
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs text-slate-500"><span>{loading ? '正在加载…' : '当前分类 ' + filtered.length + ' 个产品'}</span><span>点击卡片查看</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{filtered.map((product) => <button type="button" key={product.id} onClick={() => setSelectedId(product.id)} className={'overflow-hidden rounded-2xl border text-left transition ' + (selected?.id === product.id ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-emerald-300')}><div className="flex gap-3 p-3"><div className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white p-1">{product.images?.[0] ? <img src={imageUrl(product.images[0])} alt={product.name} className="h-full w-full object-contain" /> : <Package className="m-4 h-8 w-8 text-slate-300" />}</div><div className="min-w-0"><div className="truncate font-black text-slate-900">{product.name}</div><div className="mt-1 truncate text-xs text-emerald-700">{product.category || '未分类'}</div><div className="mt-1 text-xs text-slate-500">{(product.specifications || []).length} 个规格</div></div></div></button>)}</div>{!loading && !filtered.length && <div className="p-8 text-center text-sm text-slate-500">没有匹配的产品。</div>}</section>
      <ProductDetail product={selected} canEdit={canEdit} authHeaders={authHeaders} onSaved={(notice) => { setMessage(notice); loadProducts(); }} />
    </div>
    {message && <div className="fixed bottom-5 right-5 z-30 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg">{message}</div>}
  </div>;
};

const ProductDetail: React.FC<{ product?: Product; canEdit: boolean; authHeaders: Record<string, string>; onSaved: (message: string) => void }> = ({ product, canEdit, authHeaders, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [specDraft, setSpecDraft] = useState({ name: '', capacity: '', form: '' });
  if (!product) return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">没有找到产品资料。</div>;
  const images = (product.images || []).map(imageUrl);
  const saveProduct = async () => {
    try {
      const payload = JSON.parse(draft) as Record<string, unknown>;
      const response = await fetch('/api/admin/native/products/' + encodeURIComponent(product.id), { method: 'PATCH', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ payload }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || '产品保存失败');
      setEditing(false); onSaved('产品完整属性已保存。');
    } catch (error) { onSaved(error instanceof Error ? error.message : '产品保存失败'); }
  };
  const addSpecification = async () => {
    const response = await fetch('/api/admin/native/products/' + encodeURIComponent(product.id) + '/specs', { method: 'POST', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify(specDraft) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { onSaved(result.error || '规格新增失败'); return; }
    setSpecDraft({ name: '', capacity: '', form: '' }); onSaved('规格已新增。');
  };
  const updateSpecification = async (specification: Specification) => {
    if (!specification.id) return;
    const response = await fetch('/api/admin/native/specs/' + encodeURIComponent(specification.id), { method: 'PATCH', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify(specification) });
    const result = await response.json() as { error?: string };
    onSaved(response.ok ? '规格已保存。' : result.error || '规格保存失败');
  };
  const deleteSpecification = async (specification: Specification) => {
    if (!specification.id || !window.confirm('确定删除这个产品规格吗？')) return;
    const response = await fetch('/api/admin/native/specs/' + encodeURIComponent(specification.id), { method: 'DELETE', headers: authHeaders });
    const result = await response.json() as { error?: string };
    onSaved(response.ok ? '规格已删除。' : result.error || '规格删除失败');
  };
  const fieldDefinitions: Array<[string, string, unknown, string?]> = [['intro', '产品简介', product.intro], ['description', '产品描述', product.description], ['advantages', '产品优势', product.advantages, 'border-emerald-100 bg-emerald-50/40'], ['ingredients', '主要成分', product.ingredients, 'border-blue-100 bg-blue-50/40'], ['functions', '功能作用', product.functions], ['usage', '使用方法', product.usage], ['applicable_crops', '适用作物', product.applicable_crops], ['price_range', '价格参考', product.price_range, 'border-amber-100 bg-amber-50/40'], ['manufacturer', '生产厂家', product.manufacturer], ['seller', '销售商', product.seller], ['origin', '原产地', product.origin], ['registrations', '登记/执行信息', product.registrations, 'border-indigo-100 bg-indigo-50/40'], ['mix_profile', '混配特征', product.mix_profile, 'border-rose-100 bg-rose-50/40'], ['pesticide_compat', '产品混配规则', product.pesticide_compat], ['custom_fields', '自定义字段', product.custom_fields, 'border-purple-100 bg-purple-50/40']];
  const fieldOrder = Array.isArray(product.field_order) ? product.field_order.map((item: unknown) => String(item)) : [];
  const fields = [...fieldDefinitions].sort(([left], [right]) => {
    const leftIndex = fieldOrder.indexOf(left);
    const rightIndex = fieldOrder.indexOf(right);
    return (leftIndex < 0 ? fieldDefinitions.length : leftIndex) - (rightIndex < 0 ? fieldDefinitions.length : rightIndex);
  });
  return <section className="space-y-5">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-col gap-5 lg:flex-row"><div className="grid grid-cols-3 gap-2 lg:w-96">{images.length ? images.slice(0, 9).map((image) => <img key={image} src={image} alt={product.name} className="aspect-square w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />) : <div className="col-span-3 flex min-h-44 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"><ImageIcon className="h-10 w-10" /></div>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" />{product.category || '产品资料'}</div><h2 className="mt-2 text-3xl font-black text-slate-900">{product.name}</h2></div>{canEdit && <button type="button" onClick={() => { setDraft(JSON.stringify({ ...product, specifications: undefined, pesticide_compat: undefined }, null, 2)); setEditing(true); }} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"><Edit3 className="mr-1 inline h-3.5 w-3.5" />编辑完整属性</button>}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{display(product.intro || product.description) || '暂无简介'}</p><div className="mt-4 flex flex-wrap gap-2">{(product.specifications || []).map((specification) => <span key={specification.id || specification.name} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{specification.name || specification.capacity} · {specification.form || '未标剂型'}</span>)}</div></div></div>{editing && <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><div className="mb-2 text-xs font-black text-indigo-800">完整 JSON 属性编辑（保留所有原站字段）</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} className="w-full rounded-xl border border-indigo-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800" /><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">取消</button><button type="button" onClick={saveProduct} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">保存属性</button></div></div>}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><Tags className="h-5 w-5 text-indigo-600" />包装规格与可选参数</div>{canEdit && <span className="text-xs font-bold text-indigo-600">管理员可新增、修改、删除</span>}</div><div className="mt-4 grid gap-3 md:grid-cols-2">{(product.specifications || []).map((specification, index) => <div key={specification.id || index} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4"><div className="grid gap-2 md:grid-cols-3"><input defaultValue={specification.name || ''} onBlur={(event) => { specification.name = event.target.value; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2 text-sm font-bold" placeholder="规格名称" /><input defaultValue={specification.capacity || ''} onBlur={(event) => { specification.capacity = event.target.value; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2 text-sm" placeholder="容量" /><input defaultValue={specification.form || ''} onBlur={(event) => { specification.form = event.target.value; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2 text-sm" placeholder="剂型" /></div><div className="mt-2 flex items-center justify-between gap-2"><pre className="whitespace-pre-wrap text-xs text-slate-500">{display(specification.payload)}</pre>{canEdit && <div className="flex shrink-0 gap-2"><button type="button" onClick={() => updateSpecification(specification)} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white">保存</button><button type="button" onClick={() => deleteSpecification(specification)} className="rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></div>}</div></div>)}</div>{canEdit && <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 p-4"><div className="text-xs font-black text-slate-700">新增规格</div><div className="mt-2 grid gap-2 md:grid-cols-3"><input value={specDraft.name} onChange={(event) => setSpecDraft((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="规格名称" /><input value={specDraft.capacity} onChange={(event) => setSpecDraft((current) => ({ ...current, capacity: event.target.value }))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="容量" /><input value={specDraft.form} onChange={(event) => setSpecDraft((current) => ({ ...current, form: event.target.value }))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="剂型" /></div><button type="button" onClick={addSpecification} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">新增规格</button></div>}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><Package className="h-5 w-5 text-emerald-600" />产品完整资料</div><p className="mt-1 text-xs text-slate-500">所有核心资料默认展开；后台维护的字段顺序会同步到这里。</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{fields.map(([key, label, value, tone]) => <Field key={key} label={label} value={value} tone={tone} />)}</div></div>
  </section>;
};
