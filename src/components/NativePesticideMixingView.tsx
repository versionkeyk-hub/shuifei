import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Search, ShieldCheck } from 'lucide-react';

type Pesticide = Record<string, any> & { component: string; category?: string };
type Product = Record<string, any> & { id: string; name: string };
type MixingResult = { product: Product; status: string; interval?: string; reason: string };

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function statusClass(status: string): string {
  if (status === '禁混') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (status === '需间隔') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export const NativePesticideMixingView: React.FC = () => {
  const [pesticides, setPesticides] = useState<Pesticide[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [results, setResults] = useState<MixingResult[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetch('/api/native/pesticides?limit=10000').then((response) => response.json()).then((payload: { pesticides?: Pesticide[] }) => setPesticides(payload.pesticides || [])); }, []);
  const searchResults = useMemo(() => { const needle = query.trim().toLowerCase(); return pesticides.filter((item) => !needle || text(item).toLowerCase().includes(needle)).slice(0, 100); }, [pesticides, query]);
  const choose = async (component: string) => { setSelected(component); setLoading(true); try { const response = await fetch('/api/native/mixing?component=' + encodeURIComponent(component)); const payload = await response.json() as { results?: MixingResult[] }; setResults(payload.results || []); } finally { setLoading(false); } };
  const pesticide = pesticides.find((item) => item.component === selected);
  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-lg md:p-8"><div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><FlaskConical className="h-4 w-4" />总站原生混配规则引擎</div><h1 className="mt-3 text-2xl font-black md:text-3xl">产品混配性查询</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">检索 6,706 条农药资料，结合产品专属规则和基础成分规则显示禁混、需间隔或待核验结果。</p></header>
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入农药名称、成分或别名" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label><div className="mt-3 max-h-[calc(100vh-290px)] space-y-2 overflow-auto pr-1">{searchResults.map((item) => <button type="button" key={item.component} onClick={() => choose(item.component)} className={'w-full rounded-2xl border p-3 text-left ' + (selected === item.component ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300')}><div className="font-bold text-slate-900">{item.component}</div><div className="mt-1 text-xs text-slate-500">{item.category || '未分类'}{item.chemical_class ? ' · ' + item.chemical_class : ''}</div></button>)}</div></section>
      <section className="space-y-4"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><ShieldCheck className="h-5 w-5 text-emerald-600" />{pesticide?.component || '请选择农药成分'}</div>{pesticide && <div className="mt-3 grid gap-3 md:grid-cols-2"><div><div className="text-xs font-bold text-slate-500">解决问题</div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text(pesticide.problems) || '暂无资料'}</p></div><div><div className="text-xs font-bold text-slate-500">使用方法与注意事项</div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text(pesticide.usage || pesticide.precautions || pesticide.extra) || '暂无资料'}</p></div></div>}</div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center justify-between"><div className="text-lg font-black text-slate-900">与总站产品混配结果</div>{loading && <span className="text-xs text-slate-500">计算中…</span>}</div><div className="mt-4 grid gap-3 md:grid-cols-2">{results.map((item) => <div key={item.product.id} className={'rounded-2xl border p-4 ' + statusClass(item.status)}><div className="flex items-center justify-between gap-2"><div className="font-bold">{item.product.name}</div><span className="rounded-full border px-2 py-1 text-xs font-black">{item.status}</span></div><div className="mt-2 text-xs leading-5">{item.reason}{item.interval ? '（建议' + item.interval + '）' : ''}</div></div>)}</div></div></section>
    </div>
  </div>;
};
