import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, RotateCcw } from 'lucide-react';

interface ColorWheelPickerProps {
  currentColor: string; // Hex string e.g. '#3B82F6', named color, 'mixed', or ''
  recentColors: string[];
  onApplyColor: (color: string) => void;
  onResetColor: () => void;
  onClose?: () => void;
}

// Named CSS colors mapped to hex codes
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  silver: '#94A3B8',
  gray: '#64748B',
  grey: '#64748B',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  purple: '#A855F7',
  pink: '#EC4899',
};

// Preset color palette (organized by tone)
const PRESET_COLORS = [
  // Row 1: Neutrals & Primary
  '#000000',
  '#475569',
  '#94A3B8',
  '#FFFFFF',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  // Row 2: Accents & Pastels
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#EC4899',
  '#F43F5E',
  '#10B981',
];

// Color Conversion Helpers
interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSV {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

const hexToRgb = (hex: string): RGB | null => {
  if (!hex || hex === 'mixed') return null;
  let cleaned = hex.toLowerCase().trim();

  if (NAMED_COLORS[cleaned]) {
    cleaned = NAMED_COLORS[cleaned].replace('#', '');
  } else {
    cleaned = cleaned.replace('#', '');
  }

  if (cleaned.startsWith('rgb')) {
    const match = cleaned.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10),
        g: parseInt(match[1], 10),
        b: parseInt(match[2], 10),
      };
    }
  }

  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHsv = (r: number, g: number, b: number): HSV => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
};

const hsvToRgb = (h: number, s: number, v: number): RGB => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hsvToHex = (h: number, s: number, v: number): string => {
  const rgb = hsvToRgb(h, s, v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
};

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  currentColor,
  recentColors,
  onApplyColor,
  onResetColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  // Wheel dimensions
  const WHEEL_SIZE = 138;
  const CENTER = WHEEL_SIZE / 2;
  const RADIUS = CENTER - 4;

  const isMixed = currentColor === 'mixed';

  // Initial HSV state
  const parseColorToHsv = useCallback((colorStr: string): HSV => {
    if (colorStr && colorStr !== 'mixed') {
      const rgb = hexToRgb(colorStr);
      if (rgb) return rgbToHsv(rgb.r, rgb.g, rgb.b);
    }
    // Default to sky blue
    return { h: 217, s: 0.76, v: 0.96 };
  }, []);

  const [hsv, setHsv] = useState<HSV>(() => parseColorToHsv(currentColor));
  const [hexInput, setHexInput] = useState<string>(() => {
    if (currentColor && currentColor !== 'mixed') {
      const rgb = hexToRgb(currentColor);
      if (rgb) return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    return currentColor === 'mixed' ? '' : '#3B82F6';
  });
  const [hexError, setHexError] = useState(false);

  // Synchronize when external currentColor prop changes
  useEffect(() => {
    if (currentColor && currentColor !== 'mixed') {
      const rgb = hexToRgb(currentColor);
      if (rgb) {
        const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHsv(newHsv);
        setHexInput(rgbToHex(rgb.r, rgb.g, rgb.b));
      }
    } else if (currentColor === 'mixed') {
      setHexInput('');
    }
  }, [currentColor]);

  // Render the circular color wheel onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const actualSize = Math.round(WHEEL_SIZE * dpr);
    canvas.width = actualSize;
    canvas.height = actualSize;

    const actualCenter = actualSize / 2;
    const actualRadius = actualCenter - 4 * dpr;

    const imgData = ctx.createImageData(actualSize, actualSize);
    const data = imgData.data;

    // Generate pure rainbow spectrum (V = 1.0)
    for (let y = 0; y < actualSize; y++) {
      for (let x = 0; x < actualSize; x++) {
        const dx = x - actualCenter;
        const dy = y - actualCenter;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * actualSize + x) * 4;

        if (dist <= actualRadius) {
          const angle = Math.atan2(dy, dx);
          const h = ((angle * 180) / Math.PI + 360) % 360;
          const s = dist / actualRadius;
          const rgb = hsvToRgb(h, s, 1.0);

          // Edge antialiasing
          let alpha = 255;
          if (dist > actualRadius - 1.2 * dpr) {
            alpha = Math.round(Math.max(0, actualRadius - dist) * (255 / (1.2 * dpr)));
          }

          data[idx] = rgb.r;
          data[idx + 1] = rgb.g;
          data[idx + 2] = rgb.b;
          data[idx + 3] = alpha;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [WHEEL_SIZE]);

  // Handle pointer coordinate to HSV (Hue & Saturation)
  const updateFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - CENTER;
    const dy = y - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const angle = Math.atan2(dy, dx);
    const h = ((angle * 180) / Math.PI + 360) % 360;
    const s = Math.min(1, Math.max(0, dist / RADIUS));

    const newHsv = { h, s, v: hsv.v };
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);

    setHsv(newHsv);
    setHexInput(newHex);
    setHexError(false);
    onApplyColor(newHex);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Brightness slider change
  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newV = parseFloat(e.target.value);
    const newHsv = { ...hsv, v: newV };
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);

    setHsv(newHsv);
    setHexInput(newHex);
    setHexError(false);
    onApplyColor(newHex);
  };

  // Hex input change & validation
  const handleHexChange = (val: string) => {
    const raw = val.startsWith('#') ? val : `#${val}`;
    setHexInput(raw.toUpperCase());

    const cleaned = raw.replace('#', '').trim();
    if (/^[0-9A-Fa-f]{6}$/.test(cleaned) || /^[0-9A-Fa-f]{3}$/.test(cleaned)) {
      const rgb = hexToRgb(raw);
      if (rgb) {
        const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHsv(newHsv);
        setHexError(false);
        onApplyColor(raw.toUpperCase());
        return;
      }
    }
    setHexError(true);
  };

  // Selection from presets or recent colors
  const handleSelectExactColor = (colorHex: string) => {
    const rgb = hexToRgb(colorHex);
    if (!rgb) return;
    const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHsv(newHsv);
    setHexInput(colorHex.toUpperCase());
    setHexError(false);
    onApplyColor(colorHex.toUpperCase());
  };

  // Indicator coordinates on the wheel
  const rad = (hsv.h * Math.PI) / 180;
  const dist = hsv.s * RADIUS;
  const indicatorX = CENTER + dist * Math.cos(rad);
  const indicatorY = CENTER + dist * Math.sin(rad);

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const pureHueHex = hsvToHex(hsv.h, hsv.s, 1.0);

  return (
    <div
      role="dialog"
      aria-label="Full Color Wheel Picker"
      onMouseDown={(e) => {
        // Prevent stealing focus from contenteditable editor when interacting with picker
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
        }
      }}
      className="w-[230px] rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-700/80 shadow-2xl p-3 z-50 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 select-none"
    >
      <style>{`
        .color-brightness-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          cursor: pointer;
        }
        .color-brightness-slider::-moz-range-thumb {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          cursor: pointer;
        }
      `}</style>

      {/* 1. Circular Color Wheel */}
      <div className="flex flex-col items-center mb-2.5">
        <div
          className="relative flex items-center justify-center cursor-crosshair touch-none"
          style={{ width: `${WHEEL_SIZE}px`, height: `${WHEEL_SIZE}px` }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: `${WHEEL_SIZE}px`, height: `${WHEEL_SIZE}px`, display: 'block' }}
            className="rounded-full shadow-inner border border-slate-200/80 dark:border-slate-700/60"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          {/* Circular Selection Indicator */}
          <div
            className="absolute pointer-events-none w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.8)] transition-transform duration-75"
            style={{
              left: `${indicatorX}px`,
              top: `${indicatorY}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: currentHex,
            }}
          />
        </div>
      </div>

      {/* 2. Brightness / Value Slider */}
      <div className="mb-2.5 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          <span>Brightness</span>
          <span>{Math.round(hsv.v * 100)}%</span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={hsv.v}
            onChange={handleBrightnessChange}
            aria-label="Color Brightness"
            className="color-brightness-slider w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-hidden"
            style={{
              background: `linear-gradient(to right, #000000, ${pureHueHex})`,
            }}
          />
        </div>
      </div>

      {/* 3. HEX Input & Swatch Preview */}
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-7 h-7 rounded-lg shrink-0 border border-slate-300 dark:border-slate-600 shadow-sm relative overflow-hidden flex items-center justify-center text-[8px] font-bold text-white shadow-inner"
          style={{
            background:
              isMixed && !hexInput
                ? 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)'
                : currentHex,
          }}
          title={
            isMixed && !hexInput
              ? 'Mixed text colors in selection'
              : `Active Color: ${currentHex}`
          }
        />
        <div className="relative flex-1">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder={isMixed ? 'Mixed Colors' : '#3B82F6'}
            maxLength={7}
            aria-label="HEX Color Code"
            className={`w-full px-2 py-0.5 text-[11.5px] font-mono font-semibold rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all focus:outline-hidden ${
              hexError
                ? 'border-red-500 ring-1 ring-red-500/50'
                : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50'
            }`}
          />
        </div>
      </div>

      {/* 4. Recent Colors */}
      <div className="mb-2.5">
        <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
          Recent Colors
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {recentColors.length > 0 ? (
            recentColors.slice(0, 8).map((color, idx) => (
              <button
                key={`${color}-${idx}`}
                type="button"
                onClick={() => handleSelectExactColor(color)}
                title={color}
                aria-label={`Recent color ${color}`}
                className="w-[18px] h-[18px] rounded-full border border-slate-200 dark:border-slate-700 transition-transform hover:scale-115 cursor-pointer shadow-xs"
                style={{ backgroundColor: color }}
              />
            ))
          ) : (
            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 italic py-0.5">
              No recent colors
            </div>
          )}
        </div>
      </div>

      {/* 5. Preset Colors */}
      <div className="mb-2.5">
        <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
          Preset Colors
        </p>
        <div className="grid grid-cols-8 gap-1.5 justify-items-center">
          {PRESET_COLORS.map((color) => {
            const isSelected =
              currentColor &&
              currentColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => handleSelectExactColor(color)}
                title={color}
                aria-label={`Preset color ${color}`}
                className={`w-[18px] h-[18px] rounded-md border transition-transform hover:scale-120 cursor-pointer relative flex items-center justify-center ${
                  color === '#FFFFFF'
                    ? 'border-slate-300 dark:border-slate-600'
                    : 'border-transparent'
                } ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-md scale-105'
                    : 'hover:border-slate-400 shadow-xs'
                }`}
                style={{ backgroundColor: color }}
              >
                {isSelected && (
                  <Check
                    className={`w-2.5 h-2.5 ${
                      color === '#FFFFFF' || color === '#EAB308'
                        ? 'text-slate-900'
                        : 'text-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Reset to Default */}
      <button
        type="button"
        onClick={() => {
          onResetColor();
        }}
        className="w-full px-2 py-1 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-98 shadow-xs"
      >
        <RotateCcw className="w-3 h-3 text-slate-400 dark:text-slate-400" />
        <span>Reset to Default</span>
      </button>
    </div>
  );
};
