import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  Clipboard,
  Check,
  Eye,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: 'square' | 'video' | 'banner' | 'auto';
  className?: string;
  onPreviewOriginal?: (url: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = '图片上传 (支持粘贴、拖放与文件选择)',
  placeholder = '点击选择图片、拖拽文件或直接 Ctrl+V 粘贴进图',
  aspectRatio = 'auto',
  className = '',
  onPreviewOriginal,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteTipVisible, setPasteTipVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Process File to Base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传有效的图片文件 (JPG, PNG, WebP, GIF 等)');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result);
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      alert('图片读取失败，请重试');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Global/Container Clipboard Paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            setPasteTipVisible(true);
            setTimeout(() => setPasteTipVisible(false), 3000);
            break;
          }
        }
      }
    };

    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener('paste', handlePaste);
    }

    return () => {
      if (dropZone) {
        dropZone.removeEventListener('paste', handlePaste);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'banner'
      ? 'h-32'
      : 'min-h-[140px]';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-700 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>{label}</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            支持 粘贴 (Ctrl+V) / 拖放 / 本地上传
          </span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Upload Drop Area or Image Preview */}
      <div
        ref={dropZoneRef}
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl transition-all outline-none focus:ring-2 focus:ring-emerald-500 overflow-hidden ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
            : value
            ? 'border-slate-200 bg-slate-900/5'
            : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-slate-50'
        } ${aspectClass}`}
      >
        {value ? (
          <div className="relative group w-full h-full min-h-[140px] flex items-center justify-center bg-slate-950/5">
            <img
              src={value}
              alt="Uploaded preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain max-h-56 rounded-xl"
            />

            {/* Hover Actions Toolbar */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              {onPreviewOriginal && (
                <button
                  type="button"
                  onClick={() => onPreviewOriginal(value)}
                  className="px-2.5 py-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-xl text-xs font-bold transition-transform hover:scale-105 flex items-center gap-1 shadow-md"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>查看原图</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-xl text-xs font-bold transition-transform hover:scale-105 flex items-center gap-1 shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>更换图片</span>
              </button>

              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-transform hover:scale-105 flex items-center gap-1 shadow-md"
              >
                <X className="w-3.5 h-3.5" />
                <span>清除</span>
              </button>
            </div>

            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-md font-mono pointer-events-none backdrop-blur-xs">
              已加载图片 · 悬停可预览/更换
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-5 flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[140px] space-y-2 select-none"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                {isDragging ? '松开鼠标立即导入图片' : placeholder}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                支持直接截图后 <strong className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-mono">Ctrl+V</strong> 粘贴，或拖放图片至此处
              </p>
            </div>
          </div>
        )}

        {/* Paste Success Flash Notification */}
        {pasteTipVisible && (
          <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1 animate-bounce z-10">
            <Check className="w-3 h-3" />
            <span>已成功从剪贴板粘贴图片！</span>
          </div>
        )}
      </div>
    </div>
  );
};
