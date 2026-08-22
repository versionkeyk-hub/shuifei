import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FlaskConical, Info, Search, ShieldCheck } from 'lucide-react';
import { AppUser } from '../types';

type Pesticide = Record<string, any> & { component: string; category?: string };
type Product = Record<string, any> & { id: string; name: string };
type MixingResult = { product: Product; status: string; interval?: string; reason: string };

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(display).filter(Boolean).join('、');
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => key + '：' + display(item)).join('\n');
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return value ? [display(value)] : [];
  return value.map(display).filter(Boolean);
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
  <div className={'rounded-2xl border p-4 ' + tone}>
    <div className="text-xs font-black tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{display(value) || '暂无资料'}</div>
  </div>
);

export const NativePesticideMixingView: React.FC<{ currentUser?: AppUser | null }> = ({ currentUser }) => {
  const [pesticides, setPesticides] = useState<Pesticide[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [results, setResults] = useState<MixingResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
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

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pesticides.filter((item) => !needle || display(item).toLowerCase().includes(needle)).slice(0, 120);
  }, [pesticides, query]);

  const choose = async (component: string) => {
    setSelected(component);
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

  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-lg md:p-8">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><FlaskConical className="h-4 w-4" />原版农药资料与总站混配规则</div>
      <h1 className="mt-3 text-2xl font-black md:text-3xl">产品混配性查询</h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">完整展示农药成分、别名、类别、化学分类、pH、禁忌、品牌及原站混配结果。未知关系不再统一标记为“待核验”，而是按原站规则给出可混、需谨慎、需间隔、建议单用或禁混。</p>
    </header>
    <div className="grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入成分、别名、品牌或类别" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{pesticides.length.toLocaleString()} 条农药资料</span><span>显示 {searchResults.length} 条</span></div>
        <div className="mt-3 max-h-[calc(100vh-290px)] space-y-2 overflow-auto pr-1">{searchResults.map((item) => <button type="button" key={item.component} onClick={() => choose(item.component)} className={'w-full rounded-2xl border p-3 text-left transition ' + (selected === item.component ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300')}><div className="font-bold text-slate-900">{item.component}</div><div className="mt-1 text-xs text-slate-500">{item.category || '未分类'}{item.chemical_class ? ' · ' + item.chemical_class : ''}</div></button>)}</div>
      </section>
      <section className="space-y-5" data-selected-pesticide={selected}>
        {pesticide ? <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" />农药完整档案</div><h2 className="mt-2 text-2xl font-black text-slate-900">{pesticide.component}</h2><div className="mt-2 flex flex-wrap gap-2">{tags(pesticide.aliases).map((item) => <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">别名：{item}</span>)}</div></div><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">{pesticide.category || '未分类'}</span>{canEdit && <button type="button" onClick={() => { setDraft(JSON.stringify(pesticide, null, 2)); setEditing(true); }} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">编辑完整档案</button>}</div></div>
          {editing && <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><div className="mb-2 text-xs font-black text-indigo-800">完整 JSON 编辑（别名、化学分类、禁忌、品牌、规则标签均可维护）</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} className="w-full rounded-xl border border-indigo-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800" /><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">取消</button><button type="button" onClick={savePesticide} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">保存档案</button></div></div>}
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><DetailBlock label="化学分类" value={pesticide.chemical_class} tone="border-indigo-100 bg-indigo-50/40" /><DetailBlock label="有效/复配成分" value={componentTags} tone="border-blue-100 bg-blue-50/40" /><DetailBlock label="pH（当前账号视图）" value={pesticide.extra?.ph} tone="border-amber-100 bg-amber-50/40" /><DetailBlock label="解决问题" value={pesticide.problems} /><DetailBlock label="常见用法" value={pesticide.usage} /><DetailBlock label="注意事项" value={pesticide.precautions} /><DetailBlock label="使用禁忌" value={pesticide.extra?.contraindications} tone="border-rose-100 bg-rose-50/40" /><DetailBlock label="关联成分" value={pesticide.related} /><DetailBlock label="数据库规则标签" value={flagTags} /></div>
          {brands.length > 0 && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-black text-slate-500">品牌商品及厂家</div><div className="mt-2 grid gap-2 md:grid-cols-2">{brands.map((brand: any, index: number) => <div key={index} className="rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm"><span className="font-bold">{display(brand.name || brand)}</span>{brand.company && <span className="ml-2 text-xs text-slate-500">厂家：{brand.company}</span>}</div>)}</div></div>}
        </div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center text-sm text-slate-500"><Info className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3">从左侧选择一个农药成分，查看完整资料与混配结果。</p></div>}
        {pesticide && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-lg font-black text-slate-900"><AlertTriangle className="h-5 w-5 text-amber-500" />与总站产品的混配结果</div><p className="mt-1 text-xs text-slate-500">点击“产品属性”查看完整产品档案；公司人员显示 1:250 倍稀释技术视图，农户显示公开展示视图。</p></div>{loading && <span className="text-xs text-slate-500">计算中…</span>}</div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(counts).map(([status, count]) => <span key={status} className={'rounded-full px-3 py-1.5 text-xs font-black ' + badgeClass(status)}>{status} {count}</span>)}</div><div className="mt-4 grid gap-3 md:grid-cols-2">{results.map((item) => <div key={item.product.id} className={'rounded-2xl border p-4 ' + statusClass(item.status)}><div className="flex items-start justify-between gap-2"><div><div className="font-bold">{item.product.name}</div><div className="mt-1 text-xs opacity-75">{item.product.category || '产品'} · pH {item.product.mix_profile?.ph || '—'}{item.product.mix_profile?.ph_display_note ? ' · ' + item.product.mix_profile.ph_display_note : ''}</div></div><span className={'shrink-0 rounded-full px-2 py-1 text-xs font-black ' + badgeClass(item.status)}>{item.status}</span></div><div className="mt-3 text-xs leading-5">{item.reason}{item.interval ? '（建议间隔 ' + item.interval + '）' : ''}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedProduct(item.product)} className="rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-bold">产品属性</button>{canEdit && <RuleEditor productId={item.product.id} currentStatus={item.status} currentReason={item.reason} authHeaders={authHeaders} onSaved={() => choose(selected)} />}</div></div>)}</div></div>}
        {selectedProduct && <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm md:p-7"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold text-indigo-700">产品完整档案</div><h3 className="mt-1 text-xl font-black text-slate-900">{selectedProduct.name}</h3></div><button type="button" onClick={() => setSelectedProduct(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold">关闭</button></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><DetailBlock label="产品简介" value={selectedProduct.intro} /><DetailBlock label="主要成分" value={selectedProduct.ingredients} /><DetailBlock label="功能作用" value={selectedProduct.functions} /><DetailBlock label="使用方法" value={selectedProduct.usage} /><DetailBlock label="适用作物" value={selectedProduct.applicable_crops} /><DetailBlock label="混配特征" value={selectedProduct.mix_profile} /><DetailBlock label="价格参考" value={selectedProduct.price_range} /><DetailBlock label="厂家/销售商" value={[selectedProduct.manufacturer, selectedProduct.seller].filter(Boolean).join('\n')} /><DetailBlock label="规格" value={selectedProduct.specifications} /></div></div>}
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
