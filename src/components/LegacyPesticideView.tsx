import React, { useEffect, useState } from 'react';
import {
  BookOpenCheck,
  Database,
  ExternalLink,
  FileDown,
  FlaskConical,
  Images,
  LayoutPanelTop,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';

type LegacyMode = 'front' | 'admin';

interface LegacyPesticideViewProps {
  initialMode?: LegacyMode;
}

const LEGACY_FRONTEND_PATH = '/legacy-pesticide/index.html';
const LEGACY_ADMIN_PATH = '/legacy-pesticide/admin.html';

const catalogSummary = [
  { label: '农药资料', value: '6,706', detail: '完整农药及肥料查询记录', icon: FlaskConical, tone: 'emerald' },
  { label: '产品资料', value: '26', detail: '原版公司产品对象', icon: Database, tone: 'blue' },
  { label: '包装规格', value: '47', detail: '原产品库包装规格', icon: BookOpenCheck, tone: 'amber' },
  { label: '产品图片', value: '58', detail: '随部署包保留的原图', icon: Images, tone: 'violet' },
] as const;

const toneClassNames = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
};

export const LegacyPesticideView: React.FC<LegacyPesticideViewProps> = ({ initialMode = 'front' }) => {
  const [mode, setMode] = useState<LegacyMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const source = mode === 'admin' ? LEGACY_ADMIN_PATH : LEGACY_FRONTEND_PATH;
  const title = mode === 'admin' ? '原版农药混配管理后台' : '原版农药混配查询与产品资料库';

  return (
    <section className="min-h-full p-4 md:p-6 xl:p-8 space-y-5 bg-slate-100/70">
      <div className="max-w-[1600px] mx-auto space-y-5">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 md:p-7 text-white shadow-xl shadow-slate-900/15">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                原部署包原样保留 · 站内站运行
              </div>
              <h1 className="mt-3 text-xl font-black tracking-tight md:text-2xl">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                此页面直接加载原网站的 HTML、布局、查询逻辑、混配规则、产品字段、图片、导入导出及 Supabase 云端同步代码。
                不再通过精简字段转换，避免产品信息和六千余条农药记录丢失。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode('front')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  mode === 'front' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'bg-white/10 text-slate-100 hover:bg-white/20'
                }`}
              >
                <LayoutPanelTop className="h-4 w-4" />
                原版查询前台
              </button>
              <button
                type="button"
                onClick={() => setMode('admin')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  mode === 'admin' ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20' : 'bg-white/10 text-slate-100 hover:bg-white/20'
                }`}
              >
                <UserRoundCog className="h-4 w-4" />
                原版管理后台
              </button>
              <a
                href={source}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                <ExternalLink className="h-4 w-4" />
                新窗口原样打开
              </a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {catalogSummary.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/7 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Icon className="h-4 w-4 text-emerald-300" />
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
                  <div className="mt-1 text-[11px] leading-4 text-slate-400">{item.detail}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <div className="font-bold">原版数据文件已保留</div>
            <p className="mt-1.5 leading-5 text-emerald-800">`pesticides.js`、`products.js`、`pesticide_extras.js` 均按原文件加载。</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            <div className="font-bold">产品图按原路径加载</div>
            <p className="mt-1.5 leading-5 text-blue-800">包装图片与产品对象中的图片路径保持一致，无需逐张重新上传。</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex items-center gap-2 font-bold"><FileDown className="h-4 w-4" /> 原后台可继续导出</div>
            <p className="mt-1.5 leading-5 text-amber-800">在原版后台编辑后，继续使用原有“修改/导出数据”和云端同步流程。</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-sm font-black text-slate-900">{mode === 'admin' ? '原版管理后台（嵌入模式）' : '原版查询前台（嵌入模式）'}</div>
              <div className="mt-0.5 text-xs text-slate-500">如需完全无外层界面的原始布局，请使用“新窗口原样打开”。</div>
            </div>
            <span className={`hidden rounded-full border px-3 py-1 text-xs font-bold md:inline-flex ${toneClassNames[mode === 'admin' ? 'amber' : 'emerald']}`}>
              {mode === 'admin' ? '管理模式' : '查询模式'}
            </span>
          </div>
          <iframe
            key={source}
            src={source}
            title={title}
            className="block h-[calc(100vh-22rem)] min-h-[740px] w-full border-0 bg-white"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </section>
  );
};
