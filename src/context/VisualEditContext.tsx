import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Edit3,
  Image as ImageIcon,
  Save,
  RotateCcw,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  Sliders,
  Upload,
  Layers,
  Search,
  Check,
  Type,
  Maximize2
} from 'lucide-react';
import { SystemSettings, AppUser } from '../types';
import { getSiteText, DEFAULT_SITE_TEXTS } from '../lib/siteTexts';

interface VisualEditContextType {
  isVisualEditMode: boolean;
  setIsVisualEditMode: (enabled: boolean) => void;
  toggleVisualEditMode: () => void;
  getComputedText: (key: string, defaultText: string) => string;
  getComputedImage: (key: string, defaultUrl: string) => string;
  updateText: (key: string, val: string) => void;
  updateImage: (key: string, val: string) => void;
  pendingTextCount: number;
  pendingImageCount: number;
  saveAllChanges: () => void;
  discardAllChanges: () => void;
  resetToDefaults: () => void;
  currentUser: AppUser | null;
  openImageEditor: (imageKey: string, currentSrc: string, title?: string) => void;
  openTextEditor: (textKey: string, currentText: string, title?: string, multiline?: boolean) => void;
}

const VisualEditContext = createContext<VisualEditContextType | null>(null);

export const useVisualEdit = () => {
  const ctx = useContext(VisualEditContext);
  if (!ctx) {
    throw new Error('useVisualEdit must be used within VisualEditProvider');
  }
  return ctx;
};

interface VisualEditProviderProps {
  children: React.ReactNode;
  settings: SystemSettings;
  currentUser: AppUser | null;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

export const VisualEditProvider: React.FC<VisualEditProviderProps> = ({
  children,
  settings,
  currentUser,
  onUpdateSettings,
}) => {
  const [isVisualEditMode, setIsVisualEditMode] = useState(false);
  const [pendingTexts, setPendingTexts] = useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Active quick modal editors for click-to-edit
  const [activeTextModal, setActiveTextModal] = useState<{
    key: string;
    text: string;
    title: string;
    multiline: boolean;
  } | null>(null);

  const [activeImageModal, setActiveImageModal] = useState<{
    key: string;
    src: string;
    title: string;
  } | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // If user changes and is not super admin, turn off edit mode
  useEffect(() => {
    if (!isSuperAdmin && isVisualEditMode) {
      setIsVisualEditMode(false);
    }
  }, [isSuperAdmin, isVisualEditMode]);

  const toggleVisualEditMode = () => {
    if (!isSuperAdmin) {
      alert('抱歉，仅总管理员（超级管理员）有权限开启全站可视化修改模式！');
      return;
    }
    setIsVisualEditMode((prev) => {
      const next = !prev;
      if (next) {
        setNotification('✨ 已开启全站可视化编辑模式！点击页面任意带虚线框的文字或图片直接修改。');
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification('已退出可视化编辑模式');
        setTimeout(() => setNotification(null), 2000);
      }
      return next;
    });
  };

  const getComputedText = (key: string, defaultText: string): string => {
    if (pendingTexts[key] !== undefined) {
      return pendingTexts[key];
    }
    if (settings.siteTexts && settings.siteTexts[key] !== undefined && settings.siteTexts[key].trim() !== '') {
      return settings.siteTexts[key];
    }
    return getSiteText(key, settings.siteTexts, defaultText);
  };

  const getComputedImage = (key: string, defaultUrl: string): string => {
    if (pendingImages[key] !== undefined) {
      return pendingImages[key];
    }
    if (settings.siteImages && settings.siteImages[key]) {
      return settings.siteImages[key];
    }
    return defaultUrl;
  };

  const updateText = (key: string, val: string) => {
    setPendingTexts((prev) => ({ ...prev, [key]: val }));
  };

  const updateImage = (key: string, val: string) => {
    setPendingImages((prev) => ({ ...prev, [key]: val }));
  };

  const openTextEditor = (textKey: string, currentText: string, title = '修改文本内容', multiline = false) => {
    const val = getComputedText(textKey, currentText);
    setActiveTextModal({
      key: textKey,
      text: val,
      title,
      multiline,
    });
  };

  const openImageEditor = (imageKey: string, currentSrc: string, title = '更换图片') => {
    const src = getComputedImage(imageKey, currentSrc);
    setActiveImageModal({
      key: imageKey,
      src,
      title,
    });
  };

  const pendingTextCount = Object.keys(pendingTexts).length;
  const pendingImageCount = Object.keys(pendingImages).length;

  const saveAllChanges = () => {
    const newSiteTexts = {
      ...(settings.siteTexts || {}),
      ...pendingTexts,
    };
    const newSiteImages = {
      ...(settings.siteImages || {}),
      ...pendingImages,
    };

    onUpdateSettings({
      ...settings,
      siteTexts: newSiteTexts,
      siteImages: newSiteImages,
    });

    setPendingTexts({});
    setPendingImages({});
    setNotification('✓ 全站可视化修改已成功保存并永久生效！');
    setTimeout(() => setNotification(null), 3500);
  };

  const discardAllChanges = () => {
    if (confirm('确定放弃本次未保存的所有文案与图片修改吗？')) {
      setPendingTexts({});
      setPendingImages({});
      setNotification('已放弃本次未保存的修改');
      setTimeout(() => setNotification(null), 2500);
    }
  };

  const resetToDefaults = () => {
    if (confirm('确定要清空全站所有自定义文案与图片，恢复为系统默认初始状态吗？')) {
      onUpdateSettings({
        ...settings,
        siteTexts: {},
        siteImages: {},
      });
      setPendingTexts({});
      setPendingImages({});
      setNotification('已恢复全站文案与图片为出厂初始状态');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <VisualEditContext.Provider
      value={{
        isVisualEditMode,
        setIsVisualEditMode,
        toggleVisualEditMode,
        getComputedText,
        getComputedImage,
        updateText,
        updateImage,
        pendingTextCount,
        pendingImageCount,
        saveAllChanges,
        discardAllChanges,
        resetToDefaults,
        currentUser,
        openImageEditor,
        openTextEditor,
      }}
    >
      <div className={`relative min-h-screen ${isVisualEditMode ? 'visual-edit-mode-on' : ''}`}>
        {children}

        {/* Floating Toolbar for Super Admin */}
        {false && isSuperAdmin && (
          <VisualEditFloatingBar
            isVisualEditMode={isVisualEditMode}
            onToggle={toggleVisualEditMode}
            pendingCount={pendingTextCount + pendingImageCount}
            onSave={saveAllChanges}
            onDiscard={discardAllChanges}
            onResetDefaults={resetToDefaults}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            notification={notification}
          />
        )}

        {/* Global Quick Text Editor Modal */}
        {activeTextModal && (
          <GlobalTextEditModal
            modalData={activeTextModal}
            onClose={() => setActiveTextModal(null)}
            onSave={(val) => {
              updateText(activeTextModal.key, val);
              setActiveTextModal(null);
              setNotification(`已更新: ${activeTextModal.title}`);
              setTimeout(() => setNotification(null), 2500);
            }}
          />
        )}

        {/* Global Quick Image Editor Modal */}
        {activeImageModal && (
          <GlobalImageEditModal
            modalData={activeImageModal}
            onClose={() => setActiveImageModal(null)}
            onSave={(newSrc) => {
              updateImage(activeImageModal.key, newSrc);
              setActiveImageModal(null);
              setNotification(`已更新: ${activeImageModal.title}`);
              setTimeout(() => setNotification(null), 2500);
            }}
          />
        )}

        {/* Site Texts & Images Full Management Drawer */}
        {isDrawerOpen && (
          <SiteAssetsDrawer
            onClose={() => setIsDrawerOpen(false)}
            getComputedText={getComputedText}
            getComputedImage={getComputedImage}
            updateText={updateText}
            updateImage={updateImage}
            pendingTexts={pendingTexts}
            pendingImages={pendingImages}
            onSaveAll={() => {
              saveAllChanges();
              setIsDrawerOpen(false);
            }}
          />
        )}
      </div>
    </VisualEditContext.Provider>
  );
};

/* =========================================================
   Floating Admin Toolbar Component
========================================================= */
interface FloatingBarProps {
  isVisualEditMode: boolean;
  onToggle: () => void;
  pendingCount: number;
  onSave: () => void;
  onDiscard: () => void;
  onResetDefaults: () => void;
  onOpenDrawer: () => void;
  notification: string | null;
}

export const VisualEditFloatingBar: React.FC<FloatingBarProps> = ({
  isVisualEditMode,
  onToggle,
  pendingCount,
  onSave,
  onDiscard,
  onResetDefaults,
  onOpenDrawer,
  notification,
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 pointer-events-auto select-none">
      {/* Toast Notification */}
      {notification && (
        <div className="px-4 py-2.5 bg-slate-900 text-emerald-300 border border-emerald-500/50 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {isVisualEditMode ? (
        <div className="bg-slate-900/95 text-white rounded-3xl p-3 px-4 shadow-2xl border-2 border-emerald-500 backdrop-blur-md flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 pr-3 border-r border-slate-700">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="leading-none">
              <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>可视化编辑进行中 (点字改字·点图改图)</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                点击页面任意带绿框元素即可原地修改
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 bg-slate-800 rounded-xl text-emerald-300 font-bold border border-slate-700">
              待存修改: {pendingCount}
            </span>

            <button
              type="button"
              onClick={onOpenDrawer}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="打开全站文案与图片资产抽屉面板"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>全览抽屉</span>
            </button>

            <button
              type="button"
              onClick={onSave}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存修改</span>
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onDiscard}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all cursor-pointer"
                title="放弃本次未保存修改"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onResetDefaults}
              className="px-2.5 py-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-200 rounded-xl text-xs transition-all cursor-pointer"
              title="恢复系统出厂文案与图片"
            >
              重置
            </button>

            <button
              type="button"
              onClick={onToggle}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
              title="退出可视化编辑模式"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="group px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2.5 border border-white/20 active:scale-95 cursor-pointer"
          title="作为总管理员，点击直接在任意页面修改固定文字与替换图片"
        >
          <div className="w-6 h-6 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Edit3 className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black tracking-wide flex items-center gap-1">
              <span>总管理员·可视化编辑</span>
              <span className="px-1.5 py-0.2 bg-emerald-400/30 text-[9px] rounded-full">直接点改</span>
            </div>
            <div className="text-[10px] text-emerald-200 opacity-90">
              全站固定文案/图片点击即改
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

/* =========================================================
   EditableText Component (High-visibility on-hover and click)
========================================================= */
interface EditableTextProps {
  textKey: string;
  defaultText: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  multiline?: boolean;
  title?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  textKey,
  defaultText,
  className = '',
  as: Component = 'span',
  multiline = false,
  title,
}) => {
  const { isVisualEditMode, getComputedText, openTextEditor } = useVisualEdit();
  const currentVal = getComputedText(textKey, defaultText);

  if (isVisualEditMode) {
    return (
      <Component
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          openTextEditor(textKey, currentVal, title || defaultText.slice(0, 20), multiline);
        }}
        className={`${className} cursor-pointer relative group/editable inline-block border-b-2 border-dashed border-emerald-500 bg-emerald-50/20 hover:bg-emerald-100/60 transition-all rounded-xs px-1 text-inherit`}
        title={`点击直接修改文案 [${textKey}]`}
      >
        <span>{currentVal}</span>
        <span className="hidden group-hover/editable:inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold shadow-md align-middle">
          <Edit3 className="w-2.5 h-2.5" />
          <span>点击修改</span>
        </span>
      </Component>
    );
  }

  return <Component className={className}>{currentVal}</Component>;
};

/* =========================================================
   EditableImage Component (High-visibility on-hover and click)
========================================================= */
interface EditableImageProps {
  imageKey: string;
  defaultSrc: string;
  alt: string;
  className?: string;
  title?: string;
}

export const EditableImage: React.FC<EditableImageProps> = ({
  imageKey,
  defaultSrc,
  alt,
  className = '',
  title,
}) => {
  const { isVisualEditMode, getComputedImage, openImageEditor } = useVisualEdit();
  const currentSrc = getComputedImage(imageKey, defaultSrc);

  return (
    <div className="relative group/editimg inline-block w-full h-full">
      <img
        src={currentSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className={className}
      />

      {isVisualEditMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            openImageEditor(imageKey, currentSrc, title || alt);
          }}
          className="absolute inset-0 bg-emerald-950/60 hover:bg-emerald-950/80 backdrop-blur-xs transition-all flex flex-col items-center justify-center text-white cursor-pointer z-30 opacity-80 group-hover/editimg:opacity-100 rounded-inherit border-2 border-emerald-400 p-2 text-center"
        >
          <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-xl flex items-center gap-1.5 text-xs font-black">
            <ImageIcon className="w-4 h-4" />
            <span>点击更换/上传图片</span>
          </div>
          <span className="text-[10px] text-emerald-200 mt-1 font-mono">[{imageKey}]</span>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   ProtectedActiveContent Component
========================================================= */
interface ProtectedActiveContentProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export const ProtectedActiveContent: React.FC<ProtectedActiveContentProps> = ({
  children,
  className = '',
}) => {
  return <div className={className}>{children}</div>;
};

/* =========================================================
   Global Text Edit Modal
========================================================= */
interface GlobalTextEditModalProps {
  modalData: {
    key: string;
    text: string;
    title: string;
    multiline: boolean;
  };
  onClose: () => void;
  onSave: (val: string) => void;
}

const GlobalTextEditModal: React.FC<GlobalTextEditModalProps> = ({
  modalData,
  onClose,
  onSave,
}) => {
  const [val, setVal] = useState(modalData.text);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-800 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              修改文案 · <span className="text-xs text-slate-400 font-mono">[{modalData.key}]</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            {modalData.title}
          </label>
          {modalData.multiline ? (
            <textarea
              autoFocus
              rows={4}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full p-3 text-sm bg-slate-50 border-2 border-emerald-400 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          ) : (
            <input
              type="text"
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full p-3 text-sm font-bold bg-slate-50 border-2 border-emerald-400 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          )}
          <div className="text-[11px] text-slate-400 text-right">
            字符数: {val.length}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(val)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>确认修改</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   Global Image Edit Modal
========================================================= */
interface GlobalImageEditModalProps {
  modalData: {
    key: string;
    src: string;
    title: string;
  };
  onClose: () => void;
  onSave: (val: string) => void;
}

const GlobalImageEditModal: React.FC<GlobalImageEditModalProps> = ({
  modalData,
  onClose,
  onSave,
}) => {
  const [url, setUrl] = useState(modalData.src);
  const [preview, setPreview] = useState(modalData.src);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            setPreview(base64);
            setUrl(base64);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      onPaste={handlePaste}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              更换图片 · <span className="text-xs text-slate-400 font-mono">[{modalData.key}]</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current / New Preview */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">图片预览</label>
          <div className="h-36 w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xs text-slate-400">暂无预览</span>
            )}
          </div>
        </div>

        {/* Upload Box */}
        <div className="space-y-2">
          <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 p-4 rounded-2xl text-center flex flex-col items-center justify-center cursor-pointer transition-all">
            <Upload className="w-6 h-6 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-800">点击选择本地图片 或 按 Ctrl+V 粘贴</span>
            <span className="text-[10px] text-slate-400 mt-0.5">支持 PNG, JPG, WEBP, SVG</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">或输入网络图片 URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setPreview(e.target.value);
              }}
              placeholder="https://..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-hidden font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(url)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>确认更换</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   Site Assets Drawer (All Texts & Images Full Overview)
========================================================= */
interface SiteAssetsDrawerProps {
  onClose: () => void;
  getComputedText: (key: string, defaultText: string) => string;
  getComputedImage: (key: string, defaultUrl: string) => string;
  updateText: (key: string, val: string) => void;
  updateImage: (key: string, val: string) => void;
  pendingTexts: Record<string, string>;
  pendingImages: Record<string, string>;
  onSaveAll: () => void;
}

const SiteAssetsDrawer: React.FC<SiteAssetsDrawerProps> = ({
  onClose,
  getComputedText,
  getComputedImage,
  updateText,
  updateImage,
  pendingTexts,
  pendingImages,
  onSaveAll,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [searchTerm, setSearchTerm] = useState('');

  const siteTextEntries = (DEFAULT_SITE_TEXTS || []).map((item) => {
    const computed = getComputedText(item.key, item.defaultValue);
    const currentVal = typeof computed === 'string' ? computed : item.defaultValue;
    return {
      key: item.key,
      label: item.label || item.key,
      category: item.category || '通用',
      currentVal,
      defVal: item.defaultValue,
      isDirty: pendingTexts[item.key] !== undefined,
    };
  });

  const filteredTexts = siteTextEntries.filter(
    (item) =>
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.currentVal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">全站文案与视觉资产总览</h3>
              <p className="text-[11px] text-slate-400">集中快速修改与全景预览</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveAll}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存全部</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Search & Tabs */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索文案关键词或标识符..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'text' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              固定文案 ({filteredTexts.length})
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredTexts.map((item) => (
            <div
              key={item.key}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.isDirty
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {item.key}
                </span>
                {item.isDirty && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    已修改待存
                  </span>
                )}
              </div>

              {item.currentVal.length > 50 ? (
                <textarea
                  rows={3}
                  value={item.currentVal}
                  onChange={(e) => updateText(item.key, e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-hidden font-medium"
                />
              ) : (
                <input
                  type="text"
                  value={item.currentVal}
                  onChange={(e) => updateText(item.key, e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-hidden font-bold"
                />
              )}
            </div>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            已就绪修改项: {Object.keys(pendingTexts).length + Object.keys(pendingImages).length} 处
          </span>
          <button
            type="button"
            onClick={onSaveAll}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>保存并立即应用</span>
          </button>
        </div>
      </div>
    </div>
  );
};
