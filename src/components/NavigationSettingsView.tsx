import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Save, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';

type NavigationItem = { id?: string; tab: string; label: string; group_name: string; sort_order: number; enabled: number | boolean; admin_only?: number | boolean };

export const NavigationSettingsView: React.FC = () => {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [message, setMessage] = useState('');
  const token = sessionStorage.getItem('hmht_api_token') || '';
  const headers = { authorization: 'Bearer ' + token };

  useEffect(() => {
    fetch('/api/navigation', { headers }).then((response) => response.json()).then((payload: { items?: NavigationItem[] }) => setItems(payload.items || []));
  }, []);

  const update = (index: number, patch: Partial<NavigationItem>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    setItems((current) => { const copy = [...current]; [copy[index], copy[next]] = [copy[next], copy[index]]; return copy.map((item, itemIndex) => ({ ...item, sort_order: (itemIndex + 1) * 10 })); });
  };
  const save = async () => {
    setMessage('正在保存导航配置…');
    const response = await fetch('/api/admin/navigation', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ items: items.map((item, index) => ({ ...item, sort_order: (index + 1) * 10, enabled: Boolean(item.enabled) })) }) });
    const payload = await response.json() as { error?: string; items?: NavigationItem[] };
    if (!response.ok) { setMessage(payload.error || '保存失败'); return; }
    setItems(payload.items || items);
    setMessage('导航排序、分组和启停状态已保存到 D1。');
  };

  return <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950 to-emerald-950 p-6 text-white shadow-lg md:p-8"><div className="flex items-center gap-2 text-xs font-bold text-purple-200"><ShieldCheck className="h-4 w-4" />总站后台导航配置</div><h1 className="mt-3 text-2xl font-black">导航排序与分组</h1><p className="mt-2 text-sm leading-6 text-slate-300">可调整左侧模块顺序、组合到不同分组、修改显示名称并控制是否显示。</p></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="space-y-3">{items.map((item, index) => <div key={item.tab} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[32px_minmax(0,1fr)_180px_110px_92px]"><div className="flex items-center justify-center text-slate-400"><GripVertical className="h-5 w-5" /></div><input value={item.label} onChange={(event) => update(index, { label: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500" /><input value={item.group_name} onChange={(event) => update(index, { group_name: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" /><button type="button" onClick={() => update(index, { enabled: !Boolean(item.enabled) })} className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold">{Boolean(item.enabled) ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}{Boolean(item.enabled) ? '显示' : '隐藏'}</button><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => move(index, -1)} className="rounded-lg p-2 text-slate-500 hover:bg-white"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => move(index, 1)} className="rounded-lg p-2 text-slate-500 hover:bg-white"><ArrowDown className="h-4 w-4" /></button></div><div className="text-xs text-slate-500 md:col-span-5">标识：{item.tab}{item.admin_only ? ' · 仅管理员' : ''}</div></div>)}</div><div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm text-slate-500">{message}</span><button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><Save className="h-4 w-4" />保存配置</button></div></section>
  </div>;
};
