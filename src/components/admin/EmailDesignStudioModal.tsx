import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Palette,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  Check,
  Eye,
  Sliders,
} from 'lucide-react';
import {
  BANNER_THEME_GRADIENTS,
  type BannerStyle,
  type BannerTheme,
} from '../../types/emailTemplate';
import {
  getAllEmailTemplates,
  applyGlobalBannerDesign,
} from '../../services/emailTemplates';
import clubLogoImg from '../../assets/images/club-logo-transparent.png';

interface EmailDesignStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

interface StyleOption {
  id: BannerStyle;
  name: string;
  tag: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'modern_badge',
    name: 'Glassmorphic Badge',
    tag: 'Recommended',
    description: 'Glowing club emblem with frosted glass housing and institutional badge.',
    icon: Sparkles,
  },
  {
    id: 'official_strip',
    name: 'Official University Strip',
    tag: 'Verified',
    description: 'Top security verification strip with bold institutional typography.',
    icon: ShieldCheck,
  },
  {
    id: 'minimal',
    name: 'Minimalist Tech',
    tag: 'Modern',
    description: 'Sleek accent indicator line with spacious uppercase branding.',
    icon: Zap,
  },
  {
    id: 'classic',
    name: 'Classic Gradient',
    tag: 'Standard',
    description: 'Original high-contrast gradient banner with centered text.',
    icon: Layers,
  },
];

const THEME_OPTIONS: Array<{
  id: BannerTheme;
  name: string;
  gradientClass: string;
}> = [
  { id: 'classic_blue', name: 'CSC Royal Blue', gradientClass: 'from-blue-900 via-blue-600 to-sky-500' },
  { id: 'emerald_tech', name: 'Emerald Tech', gradientClass: 'from-emerald-950 via-emerald-600 to-teal-500' },
  { id: 'cosmic_purple', name: 'Cosmic Purple', gradientClass: 'from-indigo-950 via-indigo-600 to-purple-500' },
  { id: 'ruby_crimson', name: 'Ruby Crimson', gradientClass: 'from-rose-950 via-rose-600 to-pink-500' },
  { id: 'midnight_slate', name: 'Midnight Slate', gradientClass: 'from-slate-900 via-slate-800 to-slate-700' },
  { id: 'sunset_amber', name: 'Sunset Amber', gradientClass: 'from-amber-950 via-orange-600 to-amber-500' },
  { id: 'cyberpunk_neon', name: 'Cyberpunk Neon', gradientClass: 'from-purple-950 via-purple-600 to-cyan-500' },
  { id: 'oceanic_teal', name: 'Oceanic Teal', gradientClass: 'from-cyan-950 via-cyan-700 to-teal-500' },
  { id: 'gold_luxury', name: 'Gold Luxury', gradientClass: 'from-amber-950 via-yellow-700 to-amber-500' },
  { id: 'aurora_green', name: 'Aurora Borealis', gradientClass: 'from-emerald-950 via-teal-700 to-lime-500' },
  { id: 'solar_flare', name: 'Solar Flare', gradientClass: 'from-fuchsia-950 via-fuchsia-600 to-rose-500' },
  { id: 'obsidian_mono', name: 'Obsidian Monolith', gradientClass: 'from-black via-zinc-800 to-zinc-700' },
];

export const EmailDesignStudioModal: React.FC<EmailDesignStudioModalProps> = ({
  isOpen,
  onClose,
  onApplied,
}) => {
  const [mounted, setMounted] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<BannerStyle>('modern_badge');
  const [selectedTheme, setSelectedTheme] = useState<BannerTheme>('classic_blue');
  const [previewTitle, setPreviewTitle] = useState('Cloud Stack Club');
  const [previewSubtitle, setPreviewSubtitle] = useState('Chandigarh University');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scrolling completely when modal is open
  useEffect(() => {
    if (isOpen) {
      const count = parseInt(document.body.dataset.modalCount || '0', 10) + 1;
      document.body.dataset.modalCount = count.toString();
      if (count === 1) {
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      }

      // Load existing active banner style from approval template
      getAllEmailTemplates().then((tpls) => {
        if (tpls.approval) {
          if (tpls.approval.banner_style) setSelectedStyle(tpls.approval.banner_style);
          if (tpls.approval.banner_theme) setSelectedTheme(tpls.approval.banner_theme);
          if (tpls.approval.banner_title) setPreviewTitle(tpls.approval.banner_title);
          if (tpls.approval.banner_subtitle) setPreviewSubtitle(tpls.approval.banner_subtitle);
        }
      });

      return () => {
        const newCount = Math.max(0, parseInt(document.body.dataset.modalCount || '1', 10) - 1);
        document.body.dataset.modalCount = newCount.toString();
        if (newCount === 0) {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
        }
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await applyGlobalBannerDesign(selectedStyle, selectedTheme);
      setApplySuccess(true);
      if (onApplied) onApplied();
      setTimeout(() => {
        setApplySuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to apply banner design:', err);
    } finally {
      setIsApplying(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const currentThemeConfig = BANNER_THEME_GRADIENTS[selectedTheme] || BANNER_THEME_GRADIENTS.classic_blue;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-hidden"
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Email Header Design Studio
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  Visual Layouts
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose visual layouts and color schemes to apply across all club email templates.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* 1. Live Interactive Banner Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                Live Header & Button Preview
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentThemeConfig.name} • {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.name}
              </span>
            </div>

            <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 sm:p-6 flex justify-center">
              <div className="w-full max-w-[520px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
                {/* Dynamic Preview Header */}
                <div
                  style={{ background: currentThemeConfig.gradient }}
                  className="transition-all duration-300"
                >
                  {selectedStyle === 'modern_badge' && (
                    <div className="p-7 sm:p-8 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 border border-white/35 shadow-lg mb-3 backdrop-blur-md p-1">
                        <img
                          src={clubLogoImg}
                          alt="Cloud Stack Club"
                          className="w-full h-full object-contain filter drop-shadow-md"
                        />
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {previewTitle}
                      </h1>
                      <div className="mt-2.5">
                        <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider text-white uppercase bg-white/15 border border-white/25 shadow-xs">
                          🎓 {previewSubtitle}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedStyle === 'official_strip' && (
                    <div>
                      <div className="bg-black/25 py-2 px-4 text-center border-b border-white/10">
                        <span
                          style={{ color: currentThemeConfig.textAccent }}
                          className="text-[10px] font-extrabold uppercase tracking-widest"
                        >
                          🔒 OFFICIAL COMMUNICATION • CSC CHANDIGARH UNIVERSITY
                        </span>
                      </div>
                      <div className="p-7 text-center">
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {previewTitle}
                        </h1>
                        <p
                          style={{ color: currentThemeConfig.textAccent }}
                          className="text-xs font-bold uppercase tracking-widest mt-1.5"
                        >
                          {previewSubtitle}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedStyle === 'minimal' && (
                    <div className="p-7 text-center">
                      <div
                        style={{ background: currentThemeConfig.borderAccent }}
                        className="w-8 h-1 rounded-full mx-auto mb-3"
                      />
                      <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                        {previewTitle}
                      </h1>
                      <p
                        style={{ color: currentThemeConfig.textAccent }}
                        className="text-[11px] font-bold uppercase tracking-widest mt-1.5"
                      >
                        {previewSubtitle}
                      </p>
                    </div>
                  )}

                  {selectedStyle === 'classic' && (
                    <div className="p-8 text-center">
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {previewTitle}
                      </h1>
                      <p
                        style={{ color: currentThemeConfig.textAccent }}
                        className="text-xs font-bold uppercase tracking-widest mt-1.5"
                      >
                        {previewSubtitle}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mock Card Content Below with Matching CTA Button */}
                <div className="bg-white p-6 text-center border-t border-slate-100 space-y-4">
                  <div className="space-y-2">
                    <div className="h-3 w-48 bg-slate-200 rounded-full mx-auto" />
                    <div className="h-2.5 w-72 bg-slate-100 rounded-full mx-auto" />
                    <div className="h-2.5 w-60 bg-slate-100 rounded-full mx-auto" />
                  </div>

                  {/* Matching Call to Action Button Preview */}
                  <div className="pt-2">
                    <div
                      style={{
                        background: currentThemeConfig.buttonGradient,
                        color: currentThemeConfig.buttonTextColor,
                        boxShadow: `0 10px 25px -5px ${currentThemeConfig.buttonShadow}`,
                      }}
                      className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 transform hover:scale-105 select-none cursor-default"
                    >
                      Visit Club Portal
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Choose Design Layout Style */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              1. Choose Header Layout Style
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLE_OPTIONS.map((style) => {
                const Icon = style.icon;
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {style.name}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {style.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {style.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-2 border-t border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Layout</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Choose Color Gradient Palette */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              2. Choose Color Gradient Theme
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-full h-8 rounded-xl bg-gradient-to-r ${theme.gradientClass} shadow-inner flex items-center justify-center`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
              applySuccess
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {applySuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Applied Across All Templates!</span>
              </>
            ) : isApplying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Applying Design...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Apply Design to All Emails</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
