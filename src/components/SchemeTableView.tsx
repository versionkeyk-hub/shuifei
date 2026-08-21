import React, { useState } from 'react';
import { FertilizationScheme, WatermarkConfig, WatermarkImagePreset, SystemSettings, AppUser } from '../types';
import { DEFAULT_STAMP_PRESETS } from '../lib/stampPresets';
import { WatermarkSettingsModal } from './WatermarkSettingsModal';
import { Settings, Stamp, Sparkles } from 'lucide-react';

interface SchemeTableViewProps {
  scheme: FertilizationScheme;
  watermarkConfig: WatermarkConfig;
  settings?: SystemSettings;
  currentUser?: AppUser | null;
  selectedStamp?: WatermarkImagePreset | null;
  tableRef?: React.RefObject<HTMLDivElement | null>;
  showWatermark?: boolean;
  onUpdateWatermarkConfig?: (newConfig: WatermarkConfig) => void;
}

export const SchemeTableView: React.FC<SchemeTableViewProps> = ({
  scheme,
  watermarkConfig,
  settings,
  currentUser,
  selectedStamp,
  tableRef,
  showWatermark = true,
  onUpdateWatermarkConfig,
}) => {
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);

  const safeConfig: WatermarkConfig = watermarkConfig || settings?.watermarkConfig || {
    enabled: true,
    text: '惠民皓天 官方水肥一体化方案',
    opacity: 0.14,
    angle: -30,
    fontSize: 18,
    color: '#059669',
    density: 'normal',
    showStamp: true,
    selectedPresetId: 'stamp-official-red',
  };

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // Determine stamp image to use
  const availableStamps = settings?.watermarkImagePresets || DEFAULT_STAMP_PRESETS;
  const activeStamp =
    selectedStamp ||
    availableStamps.find((s) => s.id === safeConfig.selectedPresetId) ||
    availableStamps[0];

  const watermarkText = safeConfig.text || '惠民皓天 官方水肥一体化方案';
  const watermarkOpacity = safeConfig.opacity ?? 0.14;
  const watermarkAngle = safeConfig.angle ?? -30;
  const watermarkColor = safeConfig.color || '#059669';
  const watermarkDensity = safeConfig.density || 'normal';

  // Repeat counts for tiling
  const repeatCount = watermarkDensity === 'dense' ? 36 : watermarkDensity === 'sparse' ? 12 : 24;
  const repeatArray = Array.from({ length: repeatCount });

  return (
    <div
      ref={tableRef}
      className="bg-white p-6 md:p-10 rounded-3xl border border-slate-300 shadow-sm relative overflow-hidden text-slate-800"
      style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif' }}
    >
      {/* 
        ========================================================================
        FULL-PAGE DIAGONAL TILED WATERMARK LAYER
        ========================================================================
      */}
      {showWatermark && safeConfig.enabled && (
        <div
          onClick={() => {
            if (isAdmin && onUpdateWatermarkConfig) {
              setIsWatermarkModalOpen(true);
            }
          }}
          className={`absolute inset-0 pointer-events-auto z-10 overflow-hidden flex flex-wrap items-center justify-around select-none p-4 transition-opacity ${
            isAdmin && onUpdateWatermarkConfig ? 'cursor-pointer group hover:bg-emerald-500/5' : 'pointer-events-none'
          }`}
          title={isAdmin && onUpdateWatermarkConfig ? '点击此处可直接调整全屏平铺水印与印章设置' : undefined}
          style={{ opacity: watermarkOpacity }}
        >
          {repeatArray.map((_, i) => (
            <div
              key={i}
              className="p-6 md:p-10 text-center transform whitespace-nowrap font-black tracking-widest uppercase transition-transform"
              style={{
                transform: `rotate(${watermarkAngle}deg)`,
                color: watermarkColor,
                fontSize: `${safeConfig.fontSize || 18}px`,
              }}
            >
              {safeConfig.customWatermarkImage ? (
                <img
                  src={safeConfig.customWatermarkImage}
                  alt="Watermark logo"
                  className="h-10 w-auto object-contain inline-block"
                />
              ) : (
                <span>{watermarkText}</span>
              )}
            </div>
          ))}

          {/* Floating Admin Quick-Edit Badge */}
          {isAdmin && onUpdateWatermarkConfig && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 pointer-events-none backdrop-blur-xs">
              <Settings className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>点击修改全屏水印/印章</span>
            </div>
          )}
        </div>
      )}

      {/* Red Header Standard Top Banner */}
      <div className="text-center mb-6 relative z-20 pb-4 border-b-2 border-red-600">
        <div className="text-red-600 font-extrabold text-sm tracking-widest uppercase mb-1">
          ★ 惠民皓天农业科技 · 作物全周期水肥一体化管理方案 ★
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-red-600 tracking-tight">
          {scheme.title}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs text-slate-600 mt-2 font-semibold">
          <span>适用作物: <strong className="text-slate-900">{scheme.cropName}</strong></span>
          <span>方案类别: <strong className="text-slate-900">{scheme.schemeType}</strong></span>
          <span>编制单位: <strong className="text-emerald-700">{scheme.author}</strong></span>
          <span>版本编号: <strong className="text-slate-900">{scheme.version || '2026.08'}</strong></span>
          <span>生成日期: <strong className="text-slate-900">{scheme.updatedAt || new Date().toISOString().slice(0, 10)}</strong></span>
        </div>
      </div>

      {/* The Precise Data Table */}
      <div className="overflow-x-auto relative z-20">
        <table className="w-full border-collapse border-2 border-black text-xs md:text-sm bg-white/95 backdrop-blur-[0.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-black py-2.5 px-3 text-center font-black w-28 md:w-36">
                施肥时期
              </th>
              <th className="border border-black py-2.5 px-3 text-center font-black">
                肥料产品与配方组合
              </th>
              <th className="border border-black py-2.5 px-3 text-center font-black w-36 md:w-44">
                数量（亩用量）
              </th>
              <th className="border border-black py-2.5 px-3 text-center font-black w-32 md:w-40">
                施肥方式
              </th>
              <th className="border border-black py-2.5 px-3 text-center font-black md:w-64">
                备注与技术管理要点
              </th>
            </tr>
          </thead>
          <tbody>
            {scheme.stages.map((stage) => {
              const totalRowsInStage = Math.max(stage.items.length, 1);

              return stage.items.map((item, itemIdx) => {
                const isFirstRowOfStage = itemIdx === 0;

                return (
                  <tr key={`${stage.id}-${item.id}`} className="hover:bg-emerald-50/20 transition-colors">
                    {/* Merged Stage Column */}
                    {isFirstRowOfStage && (
                      <td
                        rowSpan={totalRowsInStage}
                        className="border border-black p-2.5 text-center font-bold bg-slate-50/90 align-middle"
                      >
                        <div className="space-y-1">
                          <span className="block text-slate-900 font-bold">{stage.stageName}</span>
                          {stage.subStageName && (
                            <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-normal rounded border border-emerald-200">
                              {stage.subStageName}
                            </span>
                          )}
                          {stage.timing && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              {stage.timing}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Fertilizer product */}
                    <td className="border border-black p-2.5 text-slate-900 font-medium align-middle">
                      <div className="flex items-center gap-1.5">
                        {item.isKeyPoint && (
                          <span className="px-1 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded shrink-0">
                            核心
                          </span>
                        )}
                        <span>{item.fertilizer}</span>
                      </div>
                    </td>

                    {/* Dosage / Quantity */}
                    <td className="border border-black p-2.5 text-center text-slate-900 font-bold align-middle font-mono">
                      {item.dosage}
                    </td>

                    {/* Application Method */}
                    <td className="border border-black p-2.5 text-center text-slate-800 align-middle">
                      {item.method}
                    </td>

                    {/* Remarks / Key Points */}
                    <td className="border border-black p-2.5 text-slate-600 text-xs align-middle">
                      {item.remarks || '-'}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* General Management Notes Footer */}
      {(scheme.generalNotes || scheme.summary) && (
        <div className="mt-4 p-4 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs text-slate-700 relative z-20 space-y-2">
          {scheme.summary && (
            <p>
              <strong className="text-slate-900">方案核心定位：</strong>
              {scheme.summary}
            </p>
          )}
          {scheme.generalNotes && (
            <p>
              <strong className="text-slate-900">综合技术与水肥一体化规程：</strong>
              {scheme.generalNotes}
            </p>
          )}
        </div>
      )}

      {/* Stamp & Certification Layer (Positioned at bottom right) */}
      {showWatermark && (safeConfig.showStamp ?? true) && activeStamp && (
        <div
          onClick={() => {
            if (isAdmin && onUpdateWatermarkConfig) {
              setIsWatermarkModalOpen(true);
            }
          }}
          className={`mt-6 flex items-center justify-between relative z-20 pt-4 border-t border-slate-200 ${
            isAdmin && onUpdateWatermarkConfig ? 'cursor-pointer hover:bg-red-50/30 p-2 rounded-2xl transition-colors' : ''
          }`}
          title={isAdmin && onUpdateWatermarkConfig ? '点击此处修改印章' : undefined}
        >
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>惠民皓天作物水肥一体化与数字化植保专家系统 · 标准输出文档</p>
            <p>未经本中心授权，不得擅自修改技术参数或商用盗用。</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">惠民皓天技术审定中心</p>
              <p className="text-[11px] text-slate-500 font-mono">
                {scheme.updatedAt || new Date().toISOString().slice(0, 10)}
              </p>
            </div>
            {/* The Official PNG / SVG Stamp image */}
            <div className="w-28 h-28 shrink-0 select-none drop-shadow-md -rotate-6">
              <img
                src={activeStamp.imageUrl}
                alt={activeStamp.title}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Admin Watermark Settings Modal */}
      {onUpdateWatermarkConfig && (
        <WatermarkSettingsModal
          isOpen={isWatermarkModalOpen}
          onClose={() => setIsWatermarkModalOpen(false)}
          config={safeConfig}
          onSaveConfig={onUpdateWatermarkConfig}
          stamps={availableStamps}
        />
      )}
    </div>
  );
};
