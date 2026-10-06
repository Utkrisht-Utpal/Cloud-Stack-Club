import React, { useState, useEffect, useRef } from 'react';
import { Check, RotateCcw, Pipette } from 'lucide-react';

export interface ColorWheelPickerProps {
  currentColor: string; // Hex string e.g. '#3B82F6', named color, 'mixed', or ''
  recentColors?: string[];
  onApplyColor: (color: string) => void;
  onResetColor: () => void;
  onClose?: () => void;
}

// 18 Curated presets in a 6x3 grid (with Theme Default Auto as option 1)
export interface ColorPreset {
  id: string;
  label: string;
  color: string; // 'auto' or hex
}

export const COLOR_PRESETS: ColorPreset[] = [
  // Row 1: Theme Adaptive & Warm/Reds
  { id: 'auto', label: 'Theme Default (Auto)', color: 'auto' },
  { id: 'slate', label: 'Slate', color: '#64748B' },
  { id: 'deepRed', label: 'Crimson', color: '#DC2626' },
  { id: 'red', label: 'Red', color: '#EF4444' },
  { id: 'orange', label: 'Orange', color: '#F97316' },
  { id: 'amber', label: 'Amber', color: '#F59E0B' },
  // Row 2: Warm & Greens
  { id: 'gold', label: 'Gold', color: '#EAB308' },
  { id: 'lime', label: 'Lime', color: '#84CC16' },
  { id: 'emerald', label: 'Emerald', color: '#10B981' },
  { id: 'teal', label: 'Teal', color: '#14B8A6' },
  { id: 'cyan', label: 'Cyan', color: '#06B6D4' },
  { id: 'sky', label: 'Sky Blue', color: '#0284C7' },
  // Row 3: Blues, Purples & Pinks
  { id: 'blue', label: 'Royal Blue', color: '#2563EB' },
  { id: 'indigo', label: 'Indigo', color: '#4F46E5' },
  { id: 'purple', label: 'Purple', color: '#7C3AED' },
  { id: 'violet', label: 'Violet', color: '#A855F7' },
  { id: 'pink', label: 'Hot Pink', color: '#EC4899' },
  { id: 'rose', label: 'Rose', color: '#F43F5E' },
];

// Color Math: HSV to Hex
function hsvToHex(h: number, s: number, v: number): string {
  const sNorm = s / 100;
  const vNorm = v / 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return vNorm - vNorm * sNorm * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const b = Math.round(f(1) * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

// Color Math: Hex to HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { h: 217, s: 76, v: 96 };
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = num & 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

// Convert any rgb/rgba/hex string to uppercase #HEX
function rgbToHex(colorStr: string): string {
  if (!colorStr) return '';
  if (colorStr.startsWith('#')) return colorStr.toUpperCase();
  const match = colorStr.match(/\d+/g);
  if (!match || match.length < 3) return colorStr;
  const r = parseInt(match[0], 10);
  const g = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  currentColor = '',
  onApplyColor,
  onResetColor,
  onClose,
}) => {
  const [colorMode, setColorMode] = useState<'presets' | 'custom'>('presets');
  const [customHex, setCustomHex] = useState('');
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>({ h: 217, s: 76, v: 96 });

  const satValRef = useRef<HTMLDivElement>(null);

  // Synchronize incoming active color
  useEffect(() => {
    if (currentColor && currentColor !== 'inherit' && currentColor !== 'auto') {
      const hex = rgbToHex(currentColor);
      if (hex && hex.startsWith('#')) {
        setCustomHex(hex.replace('#', '').toUpperCase());
        setHsv(hexToHsv(hex));
      }
    } else {
      setCustomHex('');
    }
  }, [currentColor]);

  // 2D Saturation / Brightness Drag Handler
  const updateSatValFromCoords = (clientX: number, clientY: number) => {
    const rect = satValRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);

    setHsv((prev) => {
      const next = { ...prev, s, v };
      const hex = hsvToHex(next.h, next.s, next.v);
      setCustomHex(hex.replace('#', ''));
      onApplyColor(hex);
      return next;
    });
  };

  const handleSatValDown = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    updateSatValFromCoords(clientX, clientY);

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const moveX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const moveY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
      updateSatValFromCoords(moveX, moveY);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  // Native EyeDropper API (Chromium)
  const handleEyeDropper = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const hex = result.sRGBHex.toUpperCase();
          setCustomHex(hex.replace('#', ''));
          setHsv(hexToHsv(hex));
          onApplyColor(hex);
        }
      } catch {
        // User dismissed eyedropper without picking
      }
    }
  };

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div
      role="dialog"
      aria-label="Color Studio Picker"
      onMouseDown={(e) => {
        // Prevent stealing selection focus from contenteditable editor
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      className="w-[216px] p-2.5 rounded-2xl bg-[#0f172a] text-white border border-white/20 shadow-2xl z-[60] select-none text-xs"
    >
      <style>{`
        .hue-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #111b21;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
        .hue-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #111b21;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
      `}</style>

      {/* Header: Mode Switcher & Reset */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
        {/* Presets vs Custom Spectrum Tabs */}
        <div className="flex items-center bg-white/10 p-0.5 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setColorMode('presets');
            }}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              colorMode === 'presets'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Presets
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setColorMode('custom');
            }}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              colorMode === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Reset to Default */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResetColor();
            setCustomHex('');
            onClose?.();
          }}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Reset to default text color"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Default</span>
        </button>
      </div>

      {/* MODE A: PRESETS GRID */}
      {colorMode === 'presets' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-6 gap-1.5 justify-items-center">
            {COLOR_PRESETS.map((item) => {
              if (item.color === 'auto') {
                const isAutoSelected =
                  !currentColor || currentColor === 'inherit' || currentColor === 'auto';
                return (
                  <button
                    key="auto"
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onResetColor();
                      setCustomHex('');
                      onClose?.();
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform hover:scale-115 cursor-pointer flex items-center justify-center relative overflow-hidden ${
                      isAutoSelected
                        ? 'border-white scale-110 ring-2 ring-blue-500 shadow-md'
                        : 'border-white/40'
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, #0f172a 50%, #ffffff 50%)',
                    }}
                    title="Theme Default (Adapts automatically to Light & Dark mode)"
                  >
                    {isAutoSelected && (
                      <Check className="w-3 h-3 stroke-[3] text-blue-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                    )}
                  </button>
                );
              }

              const c = item.color;
              const isSelected =
                currentColor && rgbToHex(currentColor).toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onApplyColor(c);
                    setCustomHex(c.replace('#', ''));
                    setHsv(hexToHsv(c));
                    onClose?.();
                  }}
                  className={`w-6 h-6 rounded-full border transition-transform hover:scale-115 cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'border-white scale-110 ring-2 ring-blue-500 shadow-md'
                      : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c }}
                  title={item.label}
                >
                  {isSelected && (
                    <Check
                      className={`w-3 h-3 stroke-[3] ${
                        c === '#FFFFFF' ? 'text-black' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Hex & Jump to Custom */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full border border-white/30 shrink-0 shadow-xs overflow-hidden"
              style={{
                backgroundColor:
                  currentColor && currentColor !== 'inherit' && currentColor !== 'auto'
                    ? currentColor
                    : undefined,
                backgroundImage:
                  !currentColor || currentColor === 'inherit' || currentColor === 'auto'
                    ? 'linear-gradient(135deg, #0f172a 50%, #ffffff 50%)'
                    : undefined,
              }}
              title={
                currentColor && currentColor !== 'inherit' && currentColor !== 'auto'
                  ? `Active Color: ${currentColor}`
                  : 'Theme Default (Auto)'
              }
            />
            <div className="relative flex-1 flex items-center">
              <span className="absolute left-2 text-[10px] text-slate-400 font-mono">#</span>
              <input
                type="text"
                value={customHex}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                  setCustomHex(val);
                  if (val.length === 6) {
                    const hex = `#${val}`;
                    onApplyColor(hex);
                    setHsv(hexToHsv(hex));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customHex) {
                    e.preventDefault();
                    onApplyColor(`#${customHex}`);
                    onClose?.();
                  }
                }}
                placeholder="3B82F6"
                className="w-full h-6 pl-4 pr-1 rounded-lg bg-white/10 border border-white/15 text-[11px] text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setColorMode('custom');
              }}
              className="h-6 px-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Open custom 2D spectrum picker"
            >
              <div className="w-2 h-2 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-blue-500" />
              <span>Custom</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE B: CUSTOM 2D SPECTRUM STUDIO */}
      {colorMode === 'custom' && (
        <div className="space-y-2">
          {/* 2D Saturation / Brightness Pad */}
          <div
            ref={satValRef}
            onMouseDown={handleSatValDown}
            onTouchStart={handleSatValDown}
            style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
            className="relative w-full h-24 rounded-xl cursor-crosshair overflow-hidden select-none border border-white/20 shadow-inner"
          >
            {/* Horizontal white-to-transparent gradient (Saturation) */}
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            {/* Vertical black-to-transparent gradient (Brightness) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />
            {/* Draggable Circle Handle */}
            <div
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: currentHex,
              }}
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none ring-1 ring-black/50"
            />
          </div>

          {/* Rainbow Hue Slider */}
          <div className="relative flex items-center py-0.5">
            <input
              type="range"
              min="0"
              max="360"
              value={hsv.h}
              onChange={(e) => {
                const h = Number(e.target.value);
                const next = { ...hsv, h };
                setHsv(next);
                const hex = hsvToHex(next.h, next.s, next.v);
                setCustomHex(hex.replace('#', ''));
                onApplyColor(hex);
              }}
              className="w-full h-3 rounded-full appearance-none cursor-pointer outline-none hue-slider shadow-xs"
              style={{
                background:
                  'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
              }}
            />
          </div>

          {/* Control Row: Preview, Hex Input, Eyedropper, Done */}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/10">
            {/* Live Preview Chip */}
            <div
              className="w-6 h-6 rounded-md border border-white/30 shrink-0 shadow-sm"
              style={{ backgroundColor: currentHex }}
              title={`Active Color: ${currentHex}`}
            />

            {/* Hex Input */}
            <div className="relative flex-1 flex items-center">
              <span className="absolute left-2 text-[10px] text-slate-400 font-mono">#</span>
              <input
                type="text"
                value={customHex}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                  setCustomHex(val);
                  if (val.length === 6) {
                    const hex = `#${val}`;
                    setHsv(hexToHsv(hex));
                    onApplyColor(hex);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onClose?.();
                  }
                }}
                placeholder="3B82F6"
                className="w-full h-6 pl-4 pr-1 rounded-lg bg-white/10 border border-white/15 text-[11px] text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            {/* EyeDropper button (Chromium) */}
            {typeof window !== 'undefined' && 'EyeDropper' in window && (
              <button
                type="button"
                onClick={handleEyeDropper}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
                title="Pick color from screen"
              >
                <Pipette className="w-3 h-3" />
              </button>
            )}

            {/* Done Button */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose?.();
              }}
              className="h-6 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer transition-colors shrink-0"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
