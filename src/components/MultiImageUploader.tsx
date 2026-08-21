import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  Check,
  Eye,
  RefreshCw,
  Star,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';

interface MultiImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
  maxCount?: number;
  onPreviewOriginal?: (url: string, index: number) => void;
  className?: string;
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  images = [],
  onChange,
  label = '病状高清图集 (支持批量上传多张，第一张默认作为封面图)',
  maxCount = 20,
  onPreviewOriginal,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasteTip, setPasteTip] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Read multiple files
  const processFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      alert('请上传有效的图片文件 (JPG, PNG, WebP, GIF 等)');
      return;
    }

    setIsProcessing(true);
    let loadedCount = 0;
    const newUrls: string[] = [];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          newUrls.push(result);
        }
        loadedCount++;
        if (loadedCount === validFiles.length) {
          const merged = [...images, ...newUrls].slice(0, maxCount);
          onChange(merged);
          setIsProcessing(false);
          setPasteTip(`已成功导入 ${newUrls.length} 张图片`);
          setTimeout(() => setPasteTip(''), 3000);
        }
      };
      reader.onerror = () => {
        loadedCount++;
        if (loadedCount === validFiles.length) {
          if (newUrls.length > 0) {
            onChange([...images, ...newUrls].slice(0, maxCount));
          }
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag & drop
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
      processFiles(e.dataTransfer.files);
    }
  };

  // Clipboard paste inside container
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        processFiles(pastedFiles);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('paste', handlePaste);
    }
    return () => {
      if (container) {
        container.removeEventListener('paste', handlePaste);
      }
    };
  }, [images]);

  // Set an image as primary cover (move to index 0)
  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([target, ...rest]);
  };

  // Remove an image
  const handleRemove = (index: number) => {
    const next = images.filter((_, idx) => idx !== index);
    onChange(next);
  };

  return (
    <div className={`space-y-3 ${className}`} ref={containerRef}>
      {/* Label and tips header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] text-slate-400 font-mono">
          已添加 <strong className="text-amber-700 font-bold">{images.length}</strong> / {maxCount} 张 (支持多选/拖拽/Ctrl+V批量上传)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Grid of uploaded image cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((imgUrl, index) => {
          const isCover = index === 0;
          return (
            <div
              key={`${index}-${imgUrl.slice(0, 30)}`}
              className={`group relative rounded-2xl overflow-hidden border-2 bg-slate-900 shadow-2xs transition-all flex flex-col justify-between ${
                isCover ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              {/* Image preview */}
              <div className="aspect-4/3 relative w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                <img
                  src={imgUrl}
                  alt={`图片 ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {/* Cover badge */}
                {isCover ? (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-lg shadow-md flex items-center gap-1 z-10">
                    <Star className="w-3 h-3 fill-white" />
                    <span>默认封面图</span>
                  </div>
                ) : (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 text-white font-mono text-[10px] rounded-md z-10">
                    #{index + 1}
                  </div>
                )}

                {/* Top right quick delete button */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-xl transition-colors opacity-90 group-hover:opacity-100 shadow-sm cursor-pointer z-10"
                  title="删除此图片"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Card Action Toolbar */}
              <div className="p-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] gap-1">
                {onPreviewOriginal && (
                  <button
                    type="button"
                    onClick={() => onPreviewOriginal(imgUrl, index)}
                    className="flex-1 py-1 px-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                    title="点击放大查看原图"
                  >
                    <Eye className="w-3 h-3 text-blue-600" />
                    <span>查看</span>
                  </button>
                )}

                {!isCover ? (
                  <button
                    type="button"
                    onClick={() => handleSetCover(index)}
                    className="flex-1 py-1 px-1 text-amber-700 hover:text-white hover:bg-amber-600 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                    title="将此图片设为主展示封面"
                  >
                    <Star className="w-3 h-3" />
                    <span>设为封面</span>
                  </button>
                ) : (
                  <span className="flex-1 py-1 px-1 text-amber-800 font-black text-center text-[10px] bg-amber-100/80 rounded-lg">
                    ★ 主封面
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Dropzone & Add Button */}
        {images.length < maxCount && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`min-h-[140px] border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-500 bg-amber-50/80 scale-[1.02]'
                : 'border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/30'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-amber-600 flex items-center justify-center shadow-2xs mb-2">
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>
            <span className="text-xs font-bold text-slate-800">
              {isDragging ? '松开鼠标立即导入' : '点击批量添加图片'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              一次可多选，或直接 Ctrl+V
            </span>
          </div>
        )}
      </div>

      {/* Paste Notification */}
      {pasteTip && (
        <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{pasteTip}</span>
        </div>
      )}
    </div>
  );
};
