import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Package, Search, ShieldCheck, Tags } from 'lucide-react';

type Specification = { id?: string; name?: string; capacity?: string; form?: string; payload?: Record<string, unknown> };
type Product = Record<string, any> & { id: string; name: string; category?: string; specifications?: Specification[]; images?: string[] };

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function imageUrl(value: string): string {
  if (value.startsWith('http') || value.startsWith('/')) return value;
  return '/legacy-pesticide/' + value;
}

export const NativeProductCatalogView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/native/products?limit=200').then((response) => response.json()).then((payload: { products?: Product[] }) => setProducts(payload.products || [])).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => !needle || text(product).toLowerCase().includes(needle));
  }, [products, query]);
  const selected = products.find((product) => product.id === selectedId) || filtered[0] || products[0];
  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 p-6 text-white shadow-lg md:p-8">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><ShieldCheck className="h-4 w-4" />总站产品主数据</div>
      <h1 className="mt-3 text-2xl font-black md:text-3xl">产品信息库</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">完整保留产品属性、成分、用法、登记信息、包装规格、图片、价格和混配字段，后续施肥方案直接从这里选择规格。</p>
    </header>
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索产品、成分、规格" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label>
        <div className="mt-3 text-xs text-slate-500">{loading ? '正在加载…' : '共 ' + filtered.length + ' 个产品'}</div>
        <div className="mt-3 max-h-[calc(100vh-300px)] space-y-2 overflow-auto pr-1">{filtered.map((product) => <button type="button" key={product.id} onClick={() => setSelectedId(product.id)} className={'w-full rounded-2xl border p-3 text-left transition ' + (selected && selected.id === product.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300')}><div className="font-bold text-slate-900">{product.name}</div><div className="mt-1 text-xs text-slate-500">{product.category || '未分类'} · {(product.specifications || []).length} 个规格</div></button>)}</div>
      </section>
      <ProductDetail product={selected} />
    </div>
  </div>;
};

const ProductDetail: React.FC<{ product?: Product }> = ({ product }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (!product) return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">没有找到产品资料。</div>;
  const images = (product.images || []).map(imageUrl);
  const fields: Array<[string, unknown]> = [['产品简介', product.intro], ['产品描述', product.description], ['产品优势', product.advantages], ['主要成分', product.ingredients], ['功能作用', product.functions], ['适用作物', product.applicable_crops], ['使用方法', product.usage], ['价格参考', product.price_range], ['生产厂家', product.manufacturer], ['销售商', product.seller], ['原产地', product.origin], ['登记/执行信息', product.registrations], ['自定义字段', product.custom_fields]];
  return <section className="space-y-5">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-col gap-5 xl:flex-row"><div className="grid grid-cols-3 gap-2 md:w-80">{images.slice(0, 6).map((image) => <img key={image} src={image} alt={product.name} className="aspect-square w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />)}</div><div><div className="text-xs font-bold text-emerald-700">{product.category || '产品资料'}</div><h2 className="mt-2 text-2xl font-black text-slate-900">{product.name}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{text(product.intro || product.description)}</p></div></div></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><Tags className="h-5 w-5 text-indigo-600" />包装规格与参数</div><div className="mt-4 grid gap-3 md:grid-cols-2">{(product.specifications || []).map((specification, index) => <div key={specification.id || index} className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"><div className="font-bold text-slate-900">{specification.name || specification.capacity || '规格'}</div><div className="mt-1 text-sm text-slate-600">容量：{specification.capacity || '-'} · 剂型：{specification.form || '-'}</div><pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{text(specification.payload)}</pre></div>)}</div></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="text-lg font-black text-slate-900">完整产品属性</div><div className="mt-3 divide-y divide-slate-100">{fields.map(([label, value]) => { const open = Boolean(expanded[label]); return <div key={label} className="py-3"><button type="button" onClick={() => setExpanded((current) => ({ ...current, [label]: !open }))} className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-800"><span>{label}</span>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>{open && <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{text(value) || '暂无资料'}</pre>}</div>; })}</div></div>
  </section>;
};
