import React, { useState } from 'react';
import {
  X,
  Stamp,
  Sliders,
  Sparkles,
  ShieldCheck,
  Check,
  RotateCcw,
  Layers,
  Type,
  Grid
} from 'lucide-react';
import { WatermarkConfig, WatermarkImagePreset } from '../types';
import { DEFAULT_STAMP_PRESETS } from '../lib/stampPresets';
import { ImageUploader } from './ImageUploader';

interface WatermarkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WatermarkConfig;
  onSaveConfig: (newConfig: WatermarkConfig) => void;
  stamps?: WatermarkImagePreset[];
}

export const WatermarkSettingsModal: React.FC<WatermarkSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  stamps = DEFAULT_STAMP_PRESETS,
}) => {
  const [formData, setFormData] = useState<WatermarkConfig>({
    enabled: config?.enabled ?? true,
    text: config?.text || '惠民皓天 官方水肥一体化方案',
    opacity: config?.opacity ?? 0.16,
    fontSize: config?.fontSize ?? 18,
    color: config?.color || '#059669',
    position: config?.position || 'diagonal_tiled',
    angle: config?.angle ?? -30,
    density: config?.density || 'normal',
    showStamp: config?.showStamp ?? true,
    selectedPresetId: config?.selectedPresetId || stamps[0]?.id || 'stamp-official-red',
    customWatermarkImage: config?.customWatermarkImage || '',
  });

  React.useEffect(() => {
    if (config) {
      setFormData({
        enabled: config.enabled ?? true,
        text: config.text || '惠民皓天 官方水肥一体化方案',
        opacity: config.opacity ?? 0.16,
        fontSize: config.fontSize ?? 18,
        color: config.color || '#059669',
        position: config.position || 'diagonal_tiled',
        angle: config.angle ?? -30,
        density: config.density || 'normal',
        showStamp: config.showStamp ?? true,
        selectedPresetId: config.selectedPresetId || stamps[0]?.id || 'stamp-official-red',
        customWatermarkImage: config.customWatermarkImage || '',
      });
    }
  }, [config, isOpen]);

  const [activeTab, setActiveTab] = useState<'tiled' | 'stamp'>('tiled');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  const handleResetDefaults = () => {
    setFormData({
      enabled: true,
      text: '惠民皓天 官方水肥一体化方案',
      opacity: 0.16,
      fontSize: 18,
      color: '#059669',
      position: 'diagonal_tiled',
      angle: -30,
      density: 'normal',
      showStamp: true,
      selectedPresetId: stamps[0]?.id || 'stamp-official-red',
      customWatermarkImage: '',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Stamp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                方案全屏水印与官方电子印章设置
              </h3>
              <p className="text-xs text-slate-400">
                管理员专属：自定义全屏斜向平铺水印及红头落款印章
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('tiled')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'tiled'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-emerald-600" />
            <span>全屏斜向平铺水印 (全幅画面)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stamp')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'stamp'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stamp className="w-3.5 h-3.5 text-red-600" />
            <span>底部官方红头印章 (落款盖章)</span>
          </button>
        </div>

        {/* TAB 1: Tiled Full-screen Watermark */}
        {activeTab === 'tiled' && (
          <div className="space-y-4 text-xs">
            {/* Master Toggle */}
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-900 block">开启全屏斜向平铺水印</span>
                <span className="text-[11px] text-emerald-700">
                  将在整个表格背景均匀平铺半透明防伪文字或水印图
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Watermark Text */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                平铺防伪水印文字 *
              </label>
              <input
                type="text"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="例如：惠民皓天 官方水肥一体化方案"
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Quick Text Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">常用文字快捷预设：</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '惠民皓天 官方水肥一体化方案',
                  '惠民皓天技术中心 内部审定',
                  '农小蛙植保团队 推荐配方',
                  '锄头猫功能水溶肥 专项方案',
                  '未经授权 严禁商用复制'
                ].map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => setFormData({ ...formData, text: txt })}
                    className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-[11px] font-medium transition-colors"
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Opacity, Angle, Font Size */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>水印透明度</span>
                  <span className="font-mono text-emerald-700">{Math.round((formData.opacity || 0.16) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.01"
                  value={formData.opacity ?? 0.16}
                  onChange={(e) => setFormData({ ...formData, opacity: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>倾斜角度 (度)</span>
                  <span className="font-mono text-emerald-700">{formData.angle ?? -30}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="5"
                  value={formData.angle ?? -30}
                  onChange={(e) => setFormData({ ...formData, angle: parseInt(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">平铺密度</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['dense', 'normal', 'sparse'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormData({ ...formData, density: d })}
                      className={`py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                        formData.density === d
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {d === 'dense' ? '密集' : d === 'normal' ? '标准' : '稀疏'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">水印文字颜色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color || '#059669'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={formData.color || '#059669'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 p-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Custom Watermark Image Option */}
            <div className="pt-2 border-t border-slate-100">
              <ImageUploader
                value={formData.customWatermarkImage || ''}
                onChange={(img) => setFormData({ ...formData, customWatermarkImage: img })}
                label="上传自定义水印图片/透明LOGO（可选，代替文字水印）"
                placeholder="拖放或 Ctrl+V 粘贴公司透明 Logo 图片"
                aspectRatio="banner"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Official PNG Stamp Overlay */}
        {activeTab === 'stamp' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-red-50/60 rounded-2xl border border-red-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-red-900 block">在文件右下角加盖官方印章</span>
                <span className="text-[11px] text-red-700">
                  标准红头公文落款处加盖高清晰透明电子印章
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showStamp}
                  onChange={(e) => setFormData({ ...formData, showStamp: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">选择印章款式：</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stamps.map((stamp) => {
                  const isSelected = formData.selectedPresetId === stamp.id;
                  return (
                    <div
                      key={stamp.id}
                      onClick={() => setFormData({ ...formData, selectedPresetId: stamp.id })}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-red-50 border-red-500 shadow-2xs font-bold'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={stamp.imageUrl}
                          alt={stamp.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs text-slate-900 block truncate">
                          {stamp.title}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {stamp.subtitle}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认设置</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              保存水印设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
