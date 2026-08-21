import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface ImageLightboxModalProps {
  imageUrl?: string | null;
  images?: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageUrl,
  images = [],
  initialIndex = 0,
  title = '查看原图',
  onClose,
}) => {
  // Combine single image and images array
  const allImages = images.length > 0 
    ? images 
    : imageUrl 
      ? [imageUrl] 
      : [];

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (initialIndex >= 0 && initialIndex < allImages.length) return initialIndex;
    if (imageUrl) {
      const foundIdx = allImages.indexOf(imageUrl);
      return foundIdx >= 0 ? foundIdx : 0;
    }
    return 0;
  });

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Touch gesture support for mobile swiping
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const currentImage = allImages[currentIndex] || imageUrl || '';

  // Update current index if initialIndex changes
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < allImages.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, allImages.length]);

  // Reset zoom & rotation when changing image
  useEffect(() => {
    setScale(1);
    setRotation(0);
  }, [currentIndex]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (allImages.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (allImages.length <= 1) return;
    setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allImages.length, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Mouse wheel zoom handler (wheel up = zoom in, wheel down = zoom out)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setScale((s) => {
      const nextScale = Math.min(Math.max(parseFloat((s + delta).toFixed(2)), 0.4), 5);
      return nextScale;
    });
  };

  if (!currentImage) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.min(s + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.max(s - 0.25, 0.5));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((r) => (r + 90) % 360);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setRotation(0);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `${title || '高清原图'}_${currentIndex + 1}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mobile Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 md:p-6 select-none animate-in fade-in duration-150"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between text-white z-30 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-xs md:text-sm font-bold tracking-wide truncate max-w-xs md:max-w-md">
            {title}
          </span>
          {allImages.length > 1 && (
            <span className="text-[10px] md:text-xs px-2 py-0.5 bg-emerald-600 text-white rounded-full font-mono font-bold">
              {currentIndex + 1} / {allImages.length}
            </span>
          )}
          <span className="hidden sm:inline text-[11px] px-2 py-0.5 bg-white/10 rounded-full font-mono text-slate-300">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={handleZoomIn}
            className="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
            title="放大 (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
            title="缩小 (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
            title="顺时针旋转 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="hidden sm:block px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="还原视图"
          >
            100%
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 md:p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="下载并保存原图"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">下载原图</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 bg-white/20 hover:bg-rose-600 text-white rounded-xl transition-colors ml-1 md:ml-2 cursor-pointer"
            title="关闭 (点击空白处或ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage with Left / Right Floating Buttons & Mouse Wheel Zoom */}
      <div 
        className="flex-1 flex items-center justify-center relative overflow-hidden my-2 md:my-4 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
      >
        {/* Left Nav Arrow */}
        {allImages.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 md:p-3.5 bg-black/60 hover:bg-emerald-600 text-white rounded-full transition-all hover:scale-110 shadow-lg cursor-pointer backdrop-blur-xs"
            title="上一张 (← 键盘左键)"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        {/* The Image (clicking the image won't close, clicking outside will trigger parent overlay onClose) */}
        <div
          className="relative max-h-[70vh] md:max-h-[75vh] max-w-[92vw] flex items-center justify-center select-none"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
        >
          <img
            src={currentImage}
            alt={title}
            referrerPolicy="no-referrer"
            className="max-h-[70vh] md:max-h-[75vh] max-w-[92vw] object-contain transition-transform duration-100 drop-shadow-2xl rounded-xl pointer-events-auto"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
          />
        </div>

        {/* Right Nav Arrow */}
        {allImages.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 md:p-3.5 bg-black/60 hover:bg-emerald-600 text-white rounded-full transition-all hover:scale-110 shadow-lg cursor-pointer backdrop-blur-xs"
            title="下一张 (→ 键盘右键)"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip Gallery */}
      <div
        className="z-30 shrink-0 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        {allImages.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 max-w-2xl mx-auto scrollbar-none">
            {allImages.map((thumbUrl, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-black scale-105 opacity-100 shadow-md'
                    : 'opacity-50 hover:opacity-80 hover:scale-100'
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={`缩略图 ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0.5 right-1 text-[9px] bg-black/80 text-white px-1 rounded font-mono">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-3 flex-wrap">
          <span>🖱️ 鼠标滚轮可实时缩放图片 ({Math.round(scale * 100)}%)</span>
          <span>·</span>
          <span>⌨️ 键盘左右键 / 手机滑动切图</span>
          <span>·</span>
          <span>点击黑色背景空白处或按 ESC 退出</span>
        </div>
      </div>
    </div>
  );
};
