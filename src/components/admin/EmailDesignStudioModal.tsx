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
  Compass,
  Terminal,
  Crown,
  Columns,
  Minus,
  Globe,
  UserCheck,
  UserX,
  MessageSquare,
  Radio,
  ArrowRight,
} from 'lucide-react';
import type { EmailCategory } from '../../types/email';
import {
  BANNER_THEME_GRADIENTS,
  type BannerStyle,
  type BannerTheme,
  type BannerTextColor,
} from '../../types/emailTemplate';
import {
  getAllEmailTemplates,
  applyBannerDesignToCategories,
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
    id: 'floating_pill',
    name: 'Floating Pill & Emblem',
    tag: 'Popular',
    description: 'Floating capsule badge with embedded club avatar and verification pill.',
    icon: Compass,
  },
  {
    id: 'tech_grid',
    name: 'Cyber Tech Grid',
    tag: 'Futuristic',
    description: 'Monospace terminal code tag [CSC::SYSTEM] with status indicators.',
    icon: Terminal,
  },
  {
    id: 'executive_crest',
    name: 'Executive Crest & Divider',
    tag: 'Formal',
    description: 'Ornamental divider lines with centered emblem and formal typography.',
    icon: Crown,
  },
  {
    id: 'split_hero',
    name: 'Split Horizontal Hero',
    tag: 'Balanced',
    description: 'Side-by-side layout with logo on the left and institutional badge on the right.',
    icon: Columns,
  },
  {
    id: 'compact_bar',
    name: 'Compact Low-Profile Bar',
    tag: 'Minimal',
    description: 'Sleek, low-height accent bar with inline branding for quick notices.',
    icon: Minus,
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

interface CategoryScopeOption {
  id: EmailCategory;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_SCOPE_OPTIONS: CategoryScopeOption[] = [
  {
    id: 'approval',
    name: 'Member Approval',
    description: 'Welcome & Acceptance emails sent to newly approved club applicants',
    icon: UserCheck,
  },
  {
    id: 'rejection',
    name: 'Member Rejection',
    description: 'Status update & feedback emails sent to non-selected applicants',
    icon: UserX,
  },
  {
    id: 'contact_us',
    name: 'Contact Inquiries',
    description: 'Official response & ticket updates for student and partner inquiries',
    icon: MessageSquare,
  },
  {
    id: 'event_feedback',
    name: 'Event Feedback Review',
    description: 'Coordinator responses and remarks on attendee event reviews',
    icon: Sparkles,
  },
  {
    id: 'event_broadcast',
    name: 'Event Broadcasts & Management',
    description: 'Mass notifications, announcements, and registrations for events',
    icon: Radio,
  },
];

export const EmailDesignStudioModal: React.FC<EmailDesignStudioModalProps> = ({
  isOpen,
  onClose,
  onApplied,
}) => {
  const [mounted, setMounted] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<BannerStyle>('modern_badge');
  const [selectedTheme, setSelectedTheme] = useState<BannerTheme>('classic_blue');
  const [selectedTextColor, setSelectedTextColor] = useState<BannerTextColor>('white');
  const [previewTitle, setPreviewTitle] = useState('Cloud Stack Club');
  const [previewSubtitle, setPreviewSubtitle] = useState('Chandigarh University');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  // Scope selection dialog state
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopeMode, setScopeMode] = useState<'global' | 'custom'>('global');
  const [selectedCategories, setSelectedCategories] = useState<EmailCategory[]>([
    'approval',
    'rejection',
    'contact_us',
    'event_feedback',
    'event_broadcast',
  ]);

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
          if (tpls.approval.banner_text_color) setSelectedTextColor(tpls.approval.banner_text_color);
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
      if (e.key === 'Escape') {
        if (isScopeModalOpen) {
          setIsScopeModalOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isScopeModalOpen, onClose]);

  // Toggle individual category in custom scope
  const handleToggleCategory = (cat: EmailCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(['approval', 'rejection', 'contact_us', 'event_feedback', 'event_broadcast']);
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleOpenScopeModal = () => {
    setIsScopeModalOpen(true);
  };

  const handleConfirmApply = async () => {
    const targets =
      scopeMode === 'global'
        ? ['approval', 'rejection', 'contact_us', 'event_feedback', 'event_broadcast']
        : selectedCategories;

    if (targets.length === 0) return;

    setIsApplying(true);
    try {
      await applyBannerDesignToCategories(
        targets as EmailCategory[],
        selectedStyle,
        selectedTheme,
        selectedTextColor
      );
      setAppliedCount(targets.length);
      setApplySuccess(true);
      setIsScopeModalOpen(false);
      if (onApplied) onApplied();
      setTimeout(() => {
        setApplySuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to apply banner design:', err);
    } finally {
      setIsApplying(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const currentThemeConfig = BANNER_THEME_GRADIENTS[selectedTheme] || BANNER_THEME_GRADIENTS.classic_blue;
  const isDark = selectedTextColor === 'dark';
  const titleColor = isDark ? '#0f172a' : '#ffffff';
  const subtextColor = isDark ? '#1e293b' : currentThemeConfig.textAccent;
  const badgeClass = isDark
    ? 'bg-slate-900/15 border-slate-900/30 text-slate-900'
    : 'bg-white/15 border-white/25 text-white';
  const logoHousingClass = isDark
    ? 'bg-slate-900/15 border-slate-900/30'
    : 'bg-white/20 border-white/35';
  const stripTopClass = isDark
    ? 'bg-white/35 border-slate-900/15'
    : 'bg-black/25 border-white/10';
  const stripTopColor = isDark ? '#0f172a' : currentThemeConfig.textAccent;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isScopeModalOpen) onClose();
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
                  9 Visual Layouts
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose visual layouts, color themes, and contrast. Apply as global default or to specific email categories.
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
                {currentThemeConfig.name} • {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.name} • {selectedTextColor === 'dark' ? 'Dark Text' : 'White Text'}
              </span>
            </div>

            <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 sm:p-6 flex justify-center">
              <div className="w-full max-w-[520px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
                {/* Dynamic Preview Header */}
                <div
                  style={{ background: currentThemeConfig.gradient }}
                  className="transition-all duration-300"
                >
                  {/* Style 1: modern_badge */}
                  {selectedStyle === 'modern_badge' && (
                    <div className="p-7 sm:p-8 text-center">
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border shadow-lg mb-3 backdrop-blur-md p-1 ${logoHousingClass}`}>
                        <img
                          src={clubLogoImg}
                          alt="Cloud Stack Club"
                          className="w-full h-full object-contain filter drop-shadow-md"
                        />
                      </div>
                      <h1
                        style={{ color: titleColor }}
                        className="text-xl sm:text-2xl font-black tracking-tight"
                      >
                        {previewTitle}
                      </h1>
                      <div className="mt-2.5">
                        <span className={`inline-block px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-xs ${badgeClass}`}>
                          🎓 {previewSubtitle}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Style 2: official_strip */}
                  {selectedStyle === 'official_strip' && (
                    <div>
                      <div className={`py-2 px-4 text-center border-b ${stripTopClass}`}>
                        <span
                          style={{ color: stripTopColor }}
                          className="text-[10px] font-extrabold uppercase tracking-widest"
                        >
                          🔒 OFFICIAL COMMUNICATION • CSC CHANDIGARH UNIVERSITY
                        </span>
                      </div>
                      <div className="p-7 text-center">
                        <h1
                          style={{ color: titleColor }}
                          className="text-xl sm:text-2xl font-black tracking-tight"
                        >
                          {previewTitle}
                        </h1>
                        <p
                          style={{ color: subtextColor }}
                          className="text-xs font-bold uppercase tracking-widest mt-1.5"
                        >
                          {previewSubtitle}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Style 3: floating_pill */}
                  {selectedStyle === 'floating_pill' && (
                    <div className="p-7 text-center">
                      <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border shadow-lg backdrop-blur-md bg-white/15 dark:bg-slate-900/20 border-white/30">
                        <div className="w-8 h-8 rounded-full bg-white/20 p-1 flex items-center justify-center shrink-0">
                          <img src={clubLogoImg} alt="CSC" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                          <span style={{ color: titleColor }} className="text-xs font-black block leading-tight">
                            {previewTitle}
                          </span>
                          <span style={{ color: subtextColor }} className="text-[10px] font-bold uppercase tracking-wider block">
                            {previewSubtitle}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-extrabold tracking-widest uppercase border ${badgeClass}`}>
                          ✨ VERIFIED CLUB NOTIFICATION
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Style 4: tech_grid */}
                  {selectedStyle === 'tech_grid' && (
                    <div className="p-6 text-left space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          style={{ color: currentThemeConfig.borderAccent, borderColor: currentThemeConfig.borderAccent }}
                          className="font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded border bg-black/20"
                        >
                          [CSC::SYSTEM_SECURE]
                        </span>
                        <span style={{ color: subtextColor }} className="font-mono text-[10px] font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE NOTIFICATION
                        </span>
                      </div>
                      <div className="pt-1">
                        <h1 style={{ color: titleColor }} className="text-xl font-black tracking-tight font-sans">
                          {previewTitle}
                        </h1>
                        <p style={{ color: subtextColor }} className="font-mono text-[11px] font-bold uppercase tracking-wider mt-0.5">
                          // {previewSubtitle}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Style 5: executive_crest */}
                  {selectedStyle === 'executive_crest' && (
                    <div className="p-7 text-center space-y-2">
                      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border shadow-sm backdrop-blur-md p-1 ${logoHousingClass}`}>
                        <img src={clubLogoImg} alt="CSC" className="w-full h-full object-contain" />
                      </div>
                      <div style={{ color: subtextColor }} className="text-[10px] font-black uppercase tracking-widest">
                        ─── ❖ OFFICIAL DISPATCH ❖ ───
                      </div>
                      <h1 style={{ color: titleColor }} className="text-xl font-black tracking-tight">
                        {previewTitle}
                      </h1>
                      <p style={{ color: subtextColor }} className="text-xs font-semibold uppercase tracking-widest">
                        {previewSubtitle}
                      </p>
                    </div>
                  )}

                  {/* Style 6: split_hero */}
                  {selectedStyle === 'split_hero' && (
                    <div className="p-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl border shadow-md flex items-center justify-center p-1.5 shrink-0 ${logoHousingClass}`}>
                          <img src={clubLogoImg} alt="CSC" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                          <h1 style={{ color: titleColor }} className="text-lg font-black tracking-tight leading-tight">
                            {previewTitle}
                          </h1>
                          <p style={{ color: subtextColor }} className="text-[11px] font-bold uppercase tracking-wider mt-0.5">
                            {previewSubtitle}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${badgeClass}`}>
                        🏛️ OFFICIAL
                      </span>
                    </div>
                  )}

                  {/* Style 7: compact_bar */}
                  {selectedStyle === 'compact_bar' && (
                    <div
                      style={{ borderBottomColor: currentThemeConfig.borderAccent }}
                      className="px-6 py-4 border-b-2 flex items-center justify-between"
                    >
                      <span style={{ color: titleColor }} className="text-sm font-black flex items-center gap-1.5">
                        ⚡ {previewTitle}
                      </span>
                      <span style={{ color: subtextColor }} className="text-[11px] font-bold uppercase tracking-wider">
                        {previewSubtitle}
                      </span>
                    </div>
                  )}

                  {/* Style 8: minimal */}
                  {selectedStyle === 'minimal' && (
                    <div className="p-7 text-center">
                      <div
                        style={{ background: currentThemeConfig.borderAccent }}
                        className="w-8 h-1 rounded-full mx-auto mb-3"
                      />
                      <h1
                        style={{ color: titleColor }}
                        className="text-lg sm:text-xl font-black uppercase tracking-wider"
                      >
                        {previewTitle}
                      </h1>
                      <p
                        style={{ color: subtextColor }}
                        className="text-[11px] font-bold uppercase tracking-widest mt-1.5"
                      >
                        {previewSubtitle}
                      </p>
                    </div>
                  )}

                  {/* Style 9: classic */}
                  {selectedStyle === 'classic' && (
                    <div className="p-8 text-center">
                      <h1
                        style={{ color: titleColor }}
                        className="text-xl sm:text-2xl font-black tracking-tight"
                      >
                        {previewTitle}
                      </h1>
                      <p
                        style={{ color: subtextColor }}
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
                      className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 select-none cursor-default"
                    >
                      Visit Club Portal
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Choose Design Layout Style (9 Options) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                1. Choose Header Layout Style ({STYLE_OPTIONS.length} Styles)
              </label>
              <span className="text-[11px] text-slate-400">
                Responsive & email-client tested
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STYLE_OPTIONS.map((style) => {
                const Icon = style.icon;
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
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
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {style.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Selection</span>
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-full h-7 rounded-xl bg-gradient-to-r ${theme.gradientClass} shadow-inner flex items-center justify-center`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate w-full">
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Choose Header Text & Badge Contrast */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                3. Header Text & Badge Contrast
              </label>
              <span className="text-[11px] text-slate-400">
                Optimize readability for light vs dark gradients
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTextColor('white')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedTextColor === 'white'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-sm shrink-0">
                    <span className="text-white text-sm font-black">Aa</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      Crisp White Text
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      Best for Royal Blue, Crimson, Midnight Slate & deep gradients
                    </span>
                  </div>
                </div>
                {selectedTextColor === 'white' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedTextColor('dark')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedTextColor === 'dark'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-300 shadow-sm shrink-0">
                    <span className="text-slate-900 text-sm font-black">Aa</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      Dark Slate Text
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      Best for Oceanic Teal, Gold Luxury, Aurora Green & bright gradients
                    </span>
                  </div>
                </div>
                {selectedTextColor === 'dark' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
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
            onClick={handleOpenScopeModal}
            disabled={isApplying}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
              applySuccess
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
            }`}
          >
            {applySuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Applied to {appliedCount} Email {appliedCount === 1 ? 'Template' : 'Templates'}!</span>
              </>
            ) : isApplying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Design...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save & Apply Header Design</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-75" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE SAVE SCOPE POP-UP DIALOG */}
      {/* ========================================================================= */}
      {isScopeModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isApplying) setIsScopeModalOpen(false);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Scope Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Apply Design Scope
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose where to apply this header & theme layout
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsScopeModalOpen(false)}
                disabled={isApplying}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope Modal Options Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Option A: Global Default */}
              <button
                type="button"
                onClick={() => setScopeMode('global')}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  scopeMode === 'global'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    scopeMode === 'global'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  {scopeMode === 'global' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Set as Default for ALL Emails
                    </span>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                      Global (5 Templates)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Applies this design uniformly across all email communications (Approvals, Rejections, Contact replies, Feedback, and Broadcasts).
                  </p>
                </div>
              </button>

              {/* Option B: Specific / Individual Categories */}
              <button
                type="button"
                onClick={() => setScopeMode('custom')}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  scopeMode === 'custom'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    scopeMode === 'custom'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  {scopeMode === 'custom' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Apply to Specific Email Types
                    </span>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Individual Selection
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Give different email categories their own unique look (e.g., Event Broadcasts get Cyber Tech, Member Approvals get Glassmorphic).
                  </p>
                </div>
              </button>

              {/* Multi-Select Category Checklist (Shown when 'custom' is active) */}
              {scopeMode === 'custom' && (
                <div className="pl-4 pr-1 py-3 border-l-2 border-indigo-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select target email types ({selectedCategories.length}/5 selected):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllCategories}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-400 text-xs">•</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllCategories}
                        className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {CATEGORY_SCOPE_OPTIONS.map((cat) => {
                      const isChecked = selectedCategories.includes(cat.id);
                      const Icon = cat.icon;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => handleToggleCategory(cat.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'border-indigo-500/60 bg-indigo-50/40 dark:bg-indigo-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                isChecked
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {cat.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block line-clamp-1">
                                {cat.description}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Scope Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setIsScopeModalOpen(false)}
                disabled={isApplying}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Back to Studio
              </button>

              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={isApplying || (scopeMode === 'custom' && selectedCategories.length === 0)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isApplying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {scopeMode === 'global'
                        ? 'Confirm & Set as Global Default'
                        : `Apply to ${selectedCategories.length} Selected Types`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
