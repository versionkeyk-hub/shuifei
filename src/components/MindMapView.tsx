import React, { useRef, useState } from 'react';
import { FertilizationScheme, WatermarkConfig } from '../types';
import { Download, ZoomIn, ZoomOut, RotateCcw, Sparkles, Layers, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface MindMapViewProps {
  scheme: FertilizationScheme;
  watermarkConfig: WatermarkConfig;
}

export const MindMapView: React.FC<MindMapViewProps> = ({ scheme, watermarkConfig }) => {
  const mindMapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const safeConfig: WatermarkConfig = watermarkConfig || {
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

  const handleExportPNG = async () => {
    if (!mindMapRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(mindMapRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${scheme.title}_思维导图.png`;
      a.click();
    } catch (err) {
      console.error('Export mindmap error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
      {/* Mindmap Toolbar */}
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">全周期水肥一体化管理思维导图</span>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-md">
            {scheme.stages.length} 个物候阶段
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors ml-1"
              title="重置"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? '导出中...' : '导出导图(PNG)'}</span>
          </button>
        </div>
      </div>

      {/* Mindmap Canvas Area */}
      <div className="p-6 md:p-10 overflow-x-auto min-h-[520px] flex items-center justify-center relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
        <div
          ref={mindMapRef}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="p-8 bg-white/95 rounded-3xl border border-slate-300 shadow-lg relative min-w-[760px] max-w-5xl transition-transform duration-150"
        >
          {/* Watermark in mindmap */}
          {safeConfig.enabled && (
            <div className="absolute inset-0 pointer-events-none opacity-8 flex items-center justify-center overflow-hidden">
              <span className="text-4xl font-extrabold text-emerald-900 -rotate-25 tracking-widest">
                {safeConfig.text}
              </span>
            </div>
          )}

          {/* Root Central Node */}
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-3.5 rounded-2xl shadow-md text-center max-w-md border-2 border-emerald-400">
              <span className="text-[11px] uppercase tracking-widest text-emerald-200 font-bold block">
                {scheme.cropName} · 水肥一体化管理导图
              </span>
              <h3 className="text-base md:text-lg font-black mt-0.5 tracking-tight">
                {scheme.title}
              </h3>
            </div>

            {/* Connecting trunk line */}
            <div className="w-0.5 h-8 bg-emerald-400 my-1" />

            {/* Stages Grid Nodes */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
              {scheme.stages.map((stage, sIdx) => (
                <div
                  key={stage.id}
                  className="bg-slate-50 rounded-2xl border border-slate-200 p-4 relative shadow-xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all"
                >
                  {/* Stage Header */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs md:text-sm">
                        {stage.stageName}
                      </h4>
                      {stage.subStageName && (
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                          {stage.subStageName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stage Fertilizer Items */}
                  <div className="space-y-2 text-xs">
                    {stage.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span className="text-emerald-800">{item.fertilizer}</span>
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                            {item.dosage}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>施法: <strong className="text-slate-700">{item.method}</strong></span>
                        </div>
                        {item.remarks && (
                          <div className="text-[10px] text-slate-400 bg-slate-50 p-1 rounded">
                            {item.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {stage.managementTips && (
                    <div className="mt-3 text-[10px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                      💡 {stage.managementTips}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* General notes in Mindmap */}
            {scheme.generalNotes && (
              <div className="mt-6 w-full p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs text-center">
                <strong>综合管理要点：</strong> {scheme.generalNotes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
