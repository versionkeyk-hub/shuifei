import React from 'react';
import { X, Sparkles, CheckCircle2, History, GitBranch } from 'lucide-react';
import { SYSTEM_VERSION_LOGS } from '../data/versionLogs';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">系统版本与更新日志</h3>
              <p className="text-[11px] text-slate-400">农小蛙作物水肥一体化与病虫害防治专家系统</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Timeline */}
        <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1 text-xs">
          {SYSTEM_VERSION_LOGS.map((log, idx) => (
            <div
              key={log.version}
              className={`p-4 rounded-2xl border transition-all ${
                log.isCurrent
                  ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">{log.version}</span>
                  {log.isCurrent && (
                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                      当前最新版
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{log.releaseDate}</span>
              </div>

              <h4 className="font-bold text-slate-800 text-xs mb-2">{log.title}</h4>

              <ul className="space-y-1.5 text-slate-600">
                {log.changes.map((item, cIdx) => (
                  <li key={cIdx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Node / Cloudflare Pages 静态集成兼容
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
