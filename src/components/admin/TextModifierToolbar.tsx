import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Quote,
  RotateCcw,
  Check,
  ChevronDown,
  ListOrdered,
  List,
  MoreHorizontal,
  Undo2,
  Redo2,
  Pipette,
} from 'lucide-react';

export type TextFormatCommand =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'orderedList'
  | 'unorderedList'
  | 'removeList'
  | 'blockquote';

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  orderedList: boolean;
  unorderedList: boolean;
  blockquote: boolean;
  fontSize?: string; // e.g. "14"
  lineSpacing?: string; // e.g. "1.5"
}

export interface ToolbarPosition {
  x: number;
  y: number;
  caretX: number;
  placement: 'top' | 'bottom';
}

interface TextModifierToolbarProps {
  position: ToolbarPosition | null;
  activeFormats: ActiveFormats;
  onFormat: (command: TextFormatCommand) => void;
  activeColor?: string;
  onColorChange?: (color: string) => void;
  onResetColor?: () => void;
  onFontSizeChange?: (size: string) => void;
  onLineSpacingChange?: (spacing: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

// 18 Curated presets in a 6x3 grid (with Theme Default Auto as option 1)
export interface ColorPreset {
  id: string;
  label: string;
  color: string; // 'auto' or hex
}

const COLOR_PRESETS: ColorPreset[] = [
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

const FONT_SIZES = [
  { label: '10', size: '10', desc: 'Tiny' },
  { label: '12', size: '12', desc: 'Small' },
  { label: '14', size: '14', desc: 'Regular' },
  { label: '16', size: '16', desc: 'Medium' },
  { label: '18', size: '18', desc: 'Large' },
  { label: '20', size: '20', desc: 'Extra' },
  { label: '24', size: '24', desc: 'Title' },
  { label: '28', size: '28', desc: 'Huge' },
  { label: '32', size: '32', desc: 'Banner' },
];

const LINE_SPACINGS = [
  { label: '1.0', value: '1.0', desc: 'Single' },
  { label: '1.15', value: '1.15', desc: 'Compact' },
  { label: '1.5', value: '1.5', desc: 'Normal' },
  { label: '1.75', value: '1.75', desc: 'Relaxed' },
  { label: '2.0', value: '2.0', desc: 'Double' },
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
  const b = (num & 255) / 255;

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

// Custom WhatsApp-style Strikethrough Icon
const StrikethroughIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <path d="M17 7.5A4.5 4.5 0 0 0 7 7.5" />
    <path d="M7 16.5A4.5 4.5 0 0 0 17 16.5" />
  </svg>
);

// Custom Line Spacing Icon with text lines and up/down arrows
const LineSpacingIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="7 6 5 4 3 6" />
    <polyline points="7 18 5 20 3 18" />
    <line x1="5" y1="4" x2="5" y2="20" />
    <line x1="11" y1="6" x2="21" y2="6" />
    <line x1="11" y1="12" x2="21" y2="12" />
    <line x1="11" y1="18" x2="21" y2="18" />
  </svg>
);

export const TextModifierToolbar: React.FC<TextModifierToolbarProps> = ({
  position,
  activeFormats,
  onFormat,
  activeColor = '',
  onColorChange,
  onResetColor,
  onFontSizeChange,
  onLineSpacingChange,
  onUndo,
  onRedo,
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'color' | 'fontSize' | 'more'>('none');
  const [colorMode, setColorMode] = useState<'presets' | 'custom'>('presets');
  const [customHex, setCustomHex] = useState('');
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>({ h: 217, s: 76, v: 96 });

  const satValRef = useRef<HTMLDivElement>(null);
  const fontSizeListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active font size when menu opens
  useEffect(() => {
    if (activeMenu === 'fontSize' && fontSizeListRef.current) {
      const selectedEl = fontSizeListRef.current.querySelector<HTMLElement>('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeMenu]);

  // Synchronize incoming active color
  useEffect(() => {
    if (activeColor && activeColor !== 'inherit') {
      const hex = rgbToHex(activeColor);
      if (hex && hex.startsWith('#')) {
        setCustomHex(hex.replace('#', '').toUpperCase());
        setHsv(hexToHsv(hex));
      }
    } else {
      setCustomHex('');
    }
  }, [activeColor]);

  // Close menus when toolbar hides
  useEffect(() => {
    if (!position) {
      setActiveMenu('none');
    }
  }, [position]);

  if (!position) return null;

  const handleAction = (e: React.MouseEvent, cmd: TextFormatCommand) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenu('none');
    onFormat(cmd);
  };

  const toggleMenu = (e: React.MouseEvent, menu: 'color' | 'fontSize' | 'more') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenu((prev) => (prev === menu ? 'none' : menu));
  };

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
      onColorChange?.(hex);
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
          onColorChange?.(hex);
        }
      } catch {
        // User dismissed eyedropper without picking
      }
    }
  };

  // Dropdowns always open downward cleanly without cutting off at the top of the modal
  const popoverOpensBelow = true;
  const currentFontSize = activeFormats.fontSize || '14';
  const currentLineSpacing = activeFormats.lineSpacing || '1.5';
  const isListActive = activeFormats.orderedList || activeFormats.unorderedList;
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  // Check if any format hidden under 3-dot is active
  const isMoreActive =
    activeFormats.strike ||
    activeFormats.blockquote ||
    activeFormats.orderedList ||
    activeFormats.unorderedList ||
    (activeFormats.lineSpacing && activeFormats.lineSpacing !== '1.5');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: position.placement === 'top' ? 6 : -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: position.placement === 'top' ? 6 : -6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '216px',
        }}
        className="z-50 select-none pointer-events-auto"
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {/* Floating Pill Container (4 visible features + 3-dot More menu) */}
        <div className="relative w-full flex items-center justify-between px-2 py-1 rounded-2xl bg-[#0f172a]/95 dark:bg-[#0f172a]/95 text-white border border-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-xl ring-1 ring-white/10">
          {/* 1. Bold */}
          <button
            type="button"
            title="Bold (Ctrl+B)"
            onMouseDown={(e) => handleAction(e, 'bold')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              activeFormats.bold
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="font-black text-[13px] leading-none tracking-tight">B</span>
          </button>

          {/* 2. Italic */}
          <button
            type="button"
            title="Italic (Ctrl+I)"
            onMouseDown={(e) => handleAction(e, 'italic')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              activeFormats.italic
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="font-serif italic font-bold text-[14px] leading-none tracking-tight">I</span>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-3.5 bg-white/15 my-auto shrink-0" />

          {/* 3. Text Color Picker */}
          <button
            type="button"
            title="Text Color"
            onMouseDown={(e) => toggleMenu(e, 'color')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              activeMenu === 'color'
                ? 'bg-white/20 text-white ring-1 ring-white/30'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex flex-col items-center justify-center leading-none">
              <span className="font-black text-[13px] leading-none">A</span>
              <span
                className="w-3.5 h-[3px] rounded-full mt-0.5 shadow-xs transition-colors"
                style={{
                  backgroundColor:
                    activeColor && activeColor !== 'inherit' && activeColor !== 'auto'
                      ? rgbToHex(activeColor)
                      : undefined,
                  backgroundImage:
                    !activeColor || activeColor === 'inherit' || activeColor === 'auto'
                      ? 'linear-gradient(to right, #94a3b8, #ffffff)'
                      : undefined,
                  boxShadow:
                    activeColor && activeColor !== 'inherit' && activeColor !== 'auto' && activeColor !== '#000000'
                      ? `0 0 5px ${rgbToHex(activeColor)}`
                      : undefined,
                }}
              />
            </div>
          </button>

          {/* Divider */}
          <div className="w-[1px] h-3.5 bg-white/15 my-auto shrink-0" />

          {/* 4. Font Size Dropdown (in numbers) */}
          <button
            type="button"
            title="Font Size"
            onMouseDown={(e) => toggleMenu(e, 'fontSize')}
            className={`h-7 px-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer active:scale-90 ${
              activeMenu === 'fontSize'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 hover:text-white'
            }`}
          >
            <span
              className={`text-[12px] leading-none font-mono tracking-tight ${
                currentFontSize !== '14' ? 'text-blue-400 font-extrabold' : 'font-bold'
              }`}
            >
              {currentFontSize}
            </span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {/* Divider */}
          <div className="w-[1px] h-3.5 bg-white/15 my-auto shrink-0" />

          {/* 5. 3-Dot "More" Button */}
          <button
            type="button"
            title="More formatting (Strike, Quote, Spacing, Lists, Undo, Redo)"
            onMouseDown={(e) => toggleMenu(e, 'more')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 relative ${
              activeMenu === 'more' || isMoreActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            {isMoreActive && activeMenu !== 'more' && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 ring-1 ring-[#0f172a]" />
            )}
          </button>

          {/* Pointer Caret / Triangle */}
          {position.placement === 'top' ? (
            <svg
              style={{ left: `${position.caretX}px` }}
              className="absolute top-full -translate-x-1/2 -mt-[0.5px] w-3 h-1.5 text-[#0f172a] drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] pointer-events-none"
              viewBox="0 0 12 6"
              fill="currentColor"
            >
              <path d="M0 0L6 6L12 0H0Z" />
              <path d="M0 0L6 6L12 0" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
            </svg>
          ) : (
            <svg
              style={{ left: `${position.caretX}px` }}
              className="absolute bottom-full -translate-x-1/2 -mb-[0.5px] w-3 h-1.5 text-[#0f172a] drop-shadow-[0_-2px_2px_rgba(0,0,0,0.5)] pointer-events-none"
              viewBox="0 0 12 6"
              fill="currentColor"
            >
              <path d="M0 6L6 0L12 6H0Z" />
              <path d="M0 6L6 0L12 6" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
            </svg>
          )}
        </div>

        {/* ─── DROPDOWNS & MENUS ─── */}

        {/* 1. Custom Dark Color Picker Popover (No native OS white popups!) */}
        <AnimatePresence>
          {activeMenu === 'color' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: popoverOpensBelow ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={`absolute left-0 w-full p-2.5 rounded-2xl bg-[#0f172a] text-white border border-white/20 shadow-2xl z-[60] ${
                popoverOpensBelow ? 'top-full mt-2' : 'bottom-full mb-2'
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
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
                    onResetColor?.();
                    setActiveMenu('none');
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
                          !activeColor || activeColor === 'inherit' || activeColor === 'auto';
                        return (
                          <button
                            key="auto"
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onResetColor?.();
                              setCustomHex('');
                              setActiveMenu('none');
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
                        activeColor && rgbToHex(activeColor).toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onColorChange?.(c);
                            setCustomHex(c.replace('#', ''));
                            setHsv(hexToHsv(c));
                            setActiveMenu('none');
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
                          activeColor && activeColor !== 'inherit' && activeColor !== 'auto'
                            ? activeColor
                            : undefined,
                        backgroundImage:
                          !activeColor || activeColor === 'inherit' || activeColor === 'auto'
                            ? 'linear-gradient(135deg, #0f172a 50%, #ffffff 50%)'
                            : undefined,
                      }}
                      title={
                        activeColor && activeColor !== 'inherit' && activeColor !== 'auto'
                          ? `Active Color: ${activeColor}`
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
                            onColorChange?.(hex);
                            setHsv(hexToHsv(hex));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customHex) {
                            e.preventDefault();
                            onColorChange?.(`#${customHex}`);
                            setActiveMenu('none');
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
                        onColorChange?.(hex);
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
                            onColorChange?.(hex);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setActiveMenu('none');
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
                        setActiveMenu('none');
                      }}
                      className="h-6 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Font Size Dropdown */}
        <AnimatePresence>
          {activeMenu === 'fontSize' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: popoverOpensBelow ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{ right: '8px' }}
              className={`absolute p-1.5 rounded-2xl bg-[#0f172a] text-white border border-white/20 shadow-2xl z-[60] w-32 ${
                popoverOpensBelow ? 'top-full mt-2' : 'bottom-full mb-2'
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-1">
                Font Size
              </div>
              <div
                ref={fontSizeListRef}
                className="max-h-40 overflow-y-auto no-scrollbar space-y-0.5 pr-0.5"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {FONT_SIZES.map((f) => {
                  const isSelected = currentFontSize === f.size;
                  return (
                    <button
                      key={f.size}
                      type="button"
                      data-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFontSizeChange?.(f.size);
                        setActiveMenu('none');
                      }}
                      className={`w-full px-2 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="font-mono text-[13px]">{f.label}px</span>
                      <span className="text-[10px] opacity-70 font-normal">{f.desc}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. 3-Dot "More Options" Popover */}
        <AnimatePresence>
          {activeMenu === 'more' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: popoverOpensBelow ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className={`absolute left-0 w-full p-2.5 rounded-2xl bg-[#0f172a] text-white border border-white/20 shadow-2xl z-[60] ${
                popoverOpensBelow ? 'top-full mt-2' : 'bottom-full mb-2'
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header with Undo & Redo */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  More Options
                </span>
                <div className="flex items-center gap-1">
                  {/* Undo Button */}
                  <button
                    type="button"
                    title="Undo (Ctrl+Z)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUndo?.();
                    }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer active:scale-95"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Redo Button */}
                  <button
                    type="button"
                    title="Redo (Ctrl+Y)"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRedo?.();
                    }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer active:scale-95"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Toggles: Strikethrough & Quote */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {/* Strikethrough */}
                <button
                  type="button"
                  title="Strikethrough (Ctrl+Shift+S)"
                  onMouseDown={(e) => handleAction(e, 'strike')}
                  className={`px-2 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                    activeFormats.strike
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <StrikethroughIcon className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Strike</span>
                  </div>
                  {activeFormats.strike && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* Quote */}
                <button
                  type="button"
                  title="Quote (Ctrl+Shift+9)"
                  onMouseDown={(e) => handleAction(e, 'blockquote')}
                  className={`px-2 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                    activeFormats.blockquote
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5" strokeWidth={2.4} />
                    <span className="text-[11px]">Quote</span>
                  </div>
                  {activeFormats.blockquote && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              </div>

              {/* Line Spacing Section */}
              <div className="mb-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
                  <span className="flex items-center gap-1">
                    <LineSpacingIcon className="w-3 h-3" />
                    <span>Line Spacing</span>
                  </span>
                  <span className="font-mono text-slate-300 text-[11px] font-semibold">{currentLineSpacing}x</span>
                </div>
                <div className="grid grid-cols-5 gap-1 bg-white/5 p-1 rounded-xl">
                  {LINE_SPACINGS.map((ls) => {
                    const isSelected = currentLineSpacing === ls.value;
                    return (
                      <button
                        key={ls.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onLineSpacingChange?.(ls.value);
                        }}
                        className={`py-1 rounded-lg text-center font-mono text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs scale-105'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                        title={`${ls.desc} (${ls.label})`}
                      >
                        {ls.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lists Section */}
              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-0.5">
                  List Style
                </div>

                {/* Numbered List */}
                <button
                  type="button"
                  onMouseDown={(e) => handleAction(e, 'orderedList')}
                  className={`w-full px-2 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                    activeFormats.orderedList
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span className="text-[12px]">Numbered List</span>
                  </div>
                  {activeFormats.orderedList ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <span className="text-[9px] font-mono text-slate-500">Ctrl+Shift+7</span>
                  )}
                </button>

                {/* Bulleted List */}
                <button
                  type="button"
                  onMouseDown={(e) => handleAction(e, 'unorderedList')}
                  className={`w-full px-2 py-1.5 rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                    activeFormats.unorderedList
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <List className="w-3.5 h-3.5" />
                    <span className="text-[12px]">Bulleted List</span>
                  </div>
                  {activeFormats.unorderedList ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <span className="text-[9px] font-mono text-slate-500">Ctrl+Shift+8</span>
                  )}
                </button>

                {/* Remove List (if active) */}
                {isListActive && (
                  <button
                    type="button"
                    onMouseDown={(e) => handleAction(e, 'removeList')}
                    className="w-full px-2 py-1.5 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors border-t border-white/10 mt-1 pt-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="text-[11px]">Remove List Formatting</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
