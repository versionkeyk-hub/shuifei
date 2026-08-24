import React, { useEffect, useState } from 'react';
import { CalendarDays, Clipboard, FileText, RefreshCw, Trash2 } from 'lucide-react';

type PlanItem = { product_name_snapshot?: string; product_sku_specification?: string; dose_value?: number | null; dose_unit?: string; quoted_price?: number | null };
type Plan = { id: string; title: string; crop_name?: string; target?: string; tier?: string; description?: string; created_at?: string; updated_at?: string; items?: PlanItem[] };
const tierLabels: Record<string, string> = { high: '高端配置', middle: '中端配置', low: '低端配置' };

export const PlanQuotesView: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = async () => {
    const token = sessionStorage.getItem('hmht_api_token');
    if (!token) { setMessage('登录后可以查看本人保存的方案与报价。'); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/plans', { headers: { authorization: 'Bearer ' + token } });
      const payload = await response.json() as { plans?: Plan[]; error?: string };
      if (!response.ok) throw new Error(payload.error || '方案加载失败');
      setPlans(payload.plans || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : '方案加载失败'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const copy = async (plan: Plan) => {
    const lines = (plan.items || []).map((item) => '- ' + (item.product_name_snapshot || '产品') + ' ' + (item.product_sku_specification || '') + '：' + (item.dose_value ?? '待填') + (item.dose_unit || '') + '，¥' + (item.quoted_price ?? '待报价'));
    await navigator.clipboard?.writeText(plan.title + '\n' + lines.join('\n') + '\n' + (plan.description || ''));
    setMessage('方案报价摘要已复制。');
  };
  return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 p-6 text-white shadow-lg"><div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><FileText className="h-4 w-4" />报价与方案记录</div><h1 className="mt-3 text-2xl font-black">我的方案与报价</h1><p className="mt-2 text-sm leading-6 text-slate-300">按保存时间查看本人创建的方案、规格、用量与报价；不同销售人员互不可见。</p></header>
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm"><span className="font-bold text-slate-700">共 {plans.length} 条记录</span><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-emerald-300"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />刷新</button></div>
    {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{message}</div>}
    {loading && <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">正在加载方案记录…</div>}
    {!loading && !plans.length && !message && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">还没有保存的方案报价。</div>}
    <div className="grid gap-4">{plans.map((plan) => <article key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">{plan.title}</h2><div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500"><span><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{plan.updated_at || plan.created_at || ''}</span><span>{plan.crop_name || '通用商品组合'}</span><span>{plan.target || '直接报价'}</span>{plan.tier && <span>{tierLabels[plan.tier] || plan.tier}</span>}</div></div><div className="flex gap-2"><button type="button" onClick={() => void copy(plan)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><Clipboard className="mr-1 inline h-3.5 w-3.5" />复制</button><button type="button" onClick={() => setMessage('记录管理功能将在下一版接入，当前数据保持不变。')} className="rounded-xl border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600"><Trash2 className="mr-1 inline h-3.5 w-3.5" />管理</button></div></div><div className="mt-4 grid gap-2 md:grid-cols-2">{(plan.items || []).map((item, index) => <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"><div className="font-bold text-slate-800">{item.product_name_snapshot || '产品'}</div><div className="mt-1 text-xs text-slate-500">{item.product_sku_specification || '未选规格'} · {item.dose_value ?? '待填'}{item.dose_unit || ''} · ¥{item.quoted_price ?? '待报价'}</div></div>)}</div>{plan.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{plan.description}</p>}</article>)}</div>
  </div>;
};
