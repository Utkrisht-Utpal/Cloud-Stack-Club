import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  FileImage,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

type AspectRatioPreset = '4:5' | '1:1' | '9:16' | 'free';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedFile: File) => void;
  memberName?: string;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
  memberName,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>('4:5');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag / Pan state
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image object URL when file changes
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setError(null);

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Compute aspect ratio multiplier
  const getAspectRatioValue = useCallback((preset: AspectRatioPreset): number | null => {
    switch (preset) {
      case '4:5':
        return 4 / 5; // 0.8
      case '1:1':
        return 1;
      case '9:16':
        return 9 / 16; // 0.5625
      case 'free':
        return null;
      default:
        return 4 / 5;
    }
  }, []);

  // Mouse / Touch drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialOffsetRef.current = { ...offset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Execute crop on HTML Canvas and generate clean File (< 1 MB)
  const handleCropAndSave = async () => {
    if (!imageRef.current || !containerRef.current) return;
    setIsProcessing(true);
    setError(null);

    try {
      const img = imageRef.current;
      const targetRatio = getAspectRatioValue(aspectPreset) || (img.naturalWidth / img.naturalHeight);

      // Output resolution (high resolution suitable for display)
      const targetWidth = Math.min(img.naturalWidth, 1200);
      const targetHeight = Math.round(targetWidth / targetRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas rendering context not available');
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      ctx.save();
      // Center canvas coordinates
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Scale pan offsets proportional to target resolution
      const containerRect = containerRef.current.getBoundingClientRect();
      const scaleFactorX = targetWidth / (containerRect.width || 400);
      const scaleFactorY = targetHeight / (containerRect.height || 500);

      ctx.translate(offset.x * scaleFactorX, offset.y * scaleFactorY);

      // Draw image centered
      const drawWidth = targetWidth;
      const drawHeight = (img.naturalHeight / img.naturalWidth) * targetWidth;
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      ctx.restore();

      // Convert canvas to Blob (JPEG at 0.90 quality for crisp quality under 1MB)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            setError('Failed to crop image. Please try again.');
            return;
          }

          if (blob.size > 1 * 1024 * 1024) {
            // Re-compress slightly if over 1MB
            canvas.toBlob(
              (compressedBlob) => {
                if (!compressedBlob) {
                  setIsProcessing(false);
                  setError('Compressed image generation failed.');
                  return;
                }
                const fileName = `cropped_${Date.now()}.jpg`;
                const croppedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' });
                setIsProcessing(false);
                onCropComplete(croppedFile);
                onClose();
              },
              'image/jpeg',
              0.80
            );
          } else {
            const fileName = `cropped_${Date.now()}.jpg`;
            const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
            setIsProcessing(false);
            onCropComplete(croppedFile);
            onClose();
          }
        },
        'image/jpeg',
        0.90
      );
    } catch (err: any) {
      console.error('Cropping error:', err);
      setIsProcessing(false);
      setError(err?.message || 'Failed to crop image.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Crop Profile Photo ${memberName ? `— ${memberName}` : ''}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Aspect Ratio Selector Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Crop className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span>Aspect Ratio</span>
          </span>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['4:5', '1:1', '9:16', 'free'] as AspectRatioPreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAspectPreset(preset);
                  setOffset({ x: 0, y: 0 });
                }}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  aspectPreset === preset
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {preset === '4:5' ? '4:5 (Standard)' : preset === '1:1' ? '1:1 (Square)' : preset === '9:16' ? '9:16 (Portrait)' : 'Free'}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Crop Viewport Frame */}
        <div className="relative w-full flex items-center justify-center bg-slate-950/90 rounded-2xl overflow-hidden border border-slate-800 p-3 select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              aspectRatio: aspectPreset === '4:5' ? '4/5' : aspectPreset === '1:1' ? '1/1' : aspectPreset === '9:16' ? '9/16' : '4/5',
              maxHeight: '420px',
            }}
            className="relative w-full max-w-[340px] overflow-hidden rounded-xl bg-slate-900 border-2 border-dashed border-sky-400/80 shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                className="max-w-none max-h-none w-full object-cover pointer-events-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6">
                <FileImage className="w-8 h-8 text-slate-600" />
                <span className="text-xs font-semibold">No image selected</span>
              </div>
            )}

            {/* Rule of Thirds Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30 border border-white/20">
              <div className="border-r border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div className="border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div className="border-b border-white/30" />
              <div className="border-r border-white/30" />
              <div className="border-r border-white/30" />
              <div />
            </div>

            {/* Drag hint overlay */}
            <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-slate-300 text-center pointer-events-none font-medium">
              Drag to pan • Use controls below to zoom
            </div>
          </div>
        </div>

        {/* Crop Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-100/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-blue-600 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Rotate & Reset */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleRotate}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate 90°</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setOffset({ x: 0, y: 0 });
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleCropAndSave}
            disabled={isProcessing || !imageSrc}
            icon={<Check className="w-4 h-4" />}
          >
            {isProcessing ? 'Processing Photo...' : 'Apply Crop & Upload'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
