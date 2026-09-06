import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Edit3,
  RotateCcw,
  ChevronDown,
  Ticket,
  Users2,
} from 'lucide-react';
import type { EmailCategory } from '../../types/email';
import {
  DEFAULT_EMAIL_TEMPLATES,
  type BannerStyle,
  type BannerTheme,
  type BannerTextColor,
  type EmailTemplateConfig,
} from '../../types/emailTemplate';
import {
  getAllEmailTemplates,
  applyBannerDesignToCategories,
  getSampleCategoryData,
  renderEmailHtmlPreview,
} from '../../services/emailTemplates';

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
  {
    id: 'event_registration_individual',
    name: 'Individual Registration',
    description: 'Automated confirmation pass sent to individual event registrants',
    icon: Ticket,
  },
  {
    id: 'event_registration_team_leader',
    name: 'Team Registration (Leader)',
    description: 'Team summary & pass confirmation sent to the designated team leader',
    icon: Users2,
  },
  {
    id: 'event_registration_team_member',
    name: 'Team Registration (Member)',
    description: 'Teammate notification with leader details sent to registered team members',
    icon: UserCheck,
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
  const [previewCategory, setPreviewCategory] = useState<EmailCategory>('approval');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [activeTabMobile, setActiveTabMobile] = useState<'editor' | 'preview'>('editor');
  const [refreshKey, setRefreshKey] = useState(0);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Scope selection dialog state
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopeMode, setScopeMode] = useState<'global' | 'custom'>('global');
  const [selectedCategories, setSelectedCategories] = useState<EmailCategory[]>([
    'approval',
    'rejection',
    'contact_us',
    'event_feedback',
    'event_broadcast',
    'event_registration_individual',
    'event_registration_team_leader',
    'event_registration_team_member',
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Click outside to close category sample dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCategoryDropdownOpen]);

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
        if (isCategoryDropdownOpen) {
          setIsCategoryDropdownOpen(false);
        } else if (isScopeModalOpen) {
          setIsScopeModalOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCategoryDropdownOpen, isScopeModalOpen, onClose]);

  // Generate live email preview HTML based on current configuration
  const previewHtml = useMemo(() => {
    const baseTemplate: EmailTemplateConfig = {
      ...DEFAULT_EMAIL_TEMPLATES[previewCategory],
      banner_style: selectedStyle,
      banner_theme: selectedTheme,
      banner_text_color: selectedTextColor,
      banner_title: previewTitle,
      banner_subtitle: previewSubtitle,
    };
    const sampleData = getSampleCategoryData(previewCategory);
    return renderEmailHtmlPreview(baseTemplate, sampleData);
  }, [previewCategory, selectedStyle, selectedTheme, selectedTextColor, previewTitle, previewSubtitle]);

  // Initial HTML baseline (only refreshed on category change or explicit refresh, preventing srcdoc reload flash)
  const initialHtml = useMemo(() => previewHtml, [previewCategory, refreshKey]);

  // Seamless real-time DOM update in iframe without reload flicker/blink
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(previewHtml, 'text/html');

        if (doc.title !== newDoc.title) {
          doc.title = newDoc.title;
        }

        // Smoothly update head styles/tags if changed
        if (doc.head && newDoc.head && doc.head.innerHTML !== newDoc.head.innerHTML) {
          doc.head.innerHTML = newDoc.head.innerHTML;
        }

        // Smoothly update body DOM in-place with zero iframe reload blinking
        if (doc.body && newDoc.body && doc.body.innerHTML !== newDoc.body.innerHTML) {
          doc.body.innerHTML = newDoc.body.innerHTML;
        }
      }
    } catch (err) {
      console.warn('Iframe seamless DOM update notice:', err);
    }
  }, [previewHtml]);

  // Toggle individual category in custom scope
  const handleToggleCategory = (cat: EmailCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories([
      'approval',
      'rejection',
      'contact_us',
      'event_feedback',
      'event_broadcast',
      'event_registration_individual',
      'event_registration_team_leader',
      'event_registration_team_member',
    ]);
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
        ? [
            'approval',
            'rejection',
            'contact_us',
            'event_feedback',
            'event_broadcast',
            'event_registration_individual',
            'event_registration_team_leader',
            'event_registration_team_member',
          ]
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

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isScopeModalOpen) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-hidden"
    >
      <div className="w-full max-w-6xl h-[92vh] max-h-[920px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  Visual Layouts & Themes
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

        {/* Mobile Sub-tabs: Config vs Preview */}
        <div className="flex lg:hidden border-b border-slate-200 dark:border-slate-800 px-4 py-2 gap-2 shrink-0 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTabMobile('editor')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabMobile === 'editor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Design Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTabMobile('preview')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabMobile === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* 2-Column Split Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {/* ========================================================================= */}
          {/* LEFT: Configuration / Design Controls Panel */}
          {/* ========================================================================= */}
          <div
            className={`h-full flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900 ${
              activeTabMobile === 'preview' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* 1. Header Layout Style (9 Options) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    1. Header Layout Style ({STYLE_OPTIONS.length} Presets)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Live client-tested layouts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STYLE_OPTIONS.map((style) => {
                    const Icon = style.icon;
                    const isSelected = selectedStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {style.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
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
                          <div className="mt-2 pt-1.5 border-t border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            <Check className="w-3 h-3" />
                            <span>Active Layout</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Gradient Themes (12 Options) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-500" />
                  2. Color Gradient Theme
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((theme) => {
                    const isSelected = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-full h-6 rounded-lg bg-gradient-to-r ${theme.gradientClass} shadow-inner flex items-center justify-center`}
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

              {/* 3. Header Text & Badge Contrast */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    3. Header Text & Badge Contrast
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Readability optimizer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTextColor('white')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedTextColor === 'white'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700 shadow-xs shrink-0">
                        <span className="text-white text-xs font-black">Aa</span>
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                          Crisp White Text
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                          For Royal Blue, Crimson & dark gradients
                        </span>
                      </div>
                    </div>
                    {selectedTextColor === 'white' && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTextColor('dark')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedTextColor === 'dark'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-300 shadow-xs shrink-0">
                        <span className="text-slate-900 text-xs font-black">Aa</span>
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                          Dark Slate Text
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                          For Teal, Gold & bright gradients
                        </span>
                      </div>
                    </div>
                    {selectedTextColor === 'dark' && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* 4. Banner Title & Subtitle overrides */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  4. Banner Branding Text
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Club Title
                    </label>
                    <input
                      type="text"
                      value={previewTitle}
                      onChange={(e) => setPreviewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      placeholder="Cloud Stack Club"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      University Subtitle
                    </label>
                    <input
                      type="text"
                      value={previewSubtitle}
                      onChange={(e) => setPreviewSubtitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      placeholder="Chandigarh University"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Left Panel Footer Actions */}
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
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
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
          {/* RIGHT: Real-Time Live Preview Panel */}
          {/* ========================================================================= */}
          <div
            className={`h-full flex flex-col bg-slate-100/70 dark:bg-slate-950/60 overflow-hidden ${
              activeTabMobile === 'editor' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Mock Email Client Toolbar */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-2">
                  Live Inbox Mockup
                </span>
              </div>

              {/* Themed Sample Template Switcher & Refresh */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
                  Preview Sample:
                </span>

                <div className="relative w-44 sm:w-48" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                    className={`w-full h-8 px-2.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs ${
                      isCategoryDropdownOpen
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {(() => {
                        const activeCat = CATEGORY_SCOPE_OPTIONS.find((c) => c.id === previewCategory);
                        const Icon = activeCat?.icon || Sparkles;
                        return (
                          <>
                            <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="truncate">
                              {activeCat?.name || 'Member Approval'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${
                        isCategoryDropdownOpen ? 'rotate-180 text-indigo-500' : ''
                      }`}
                    />
                  </button>

                  {/* Floating Custom Dropdown Menu with Exact Matching Width */}
                  {isCategoryDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 w-full rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                      {CATEGORY_SCOPE_OPTIONS.map((cat) => {
                        const isSelected = cat.id === previewCategory;
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setPreviewCategory(cat.id);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-2 py-1.5 rounded-xl text-left text-[11px] font-semibold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                              <span className="truncate">{cat.name}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  title="Force Refresh Preview"
                  className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Email Metadata Header Preview */}
            <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold w-14">From:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Cloud Stack Club <span className="text-slate-400">&lt;cloudstackclub@cumail.in&gt;</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold w-14">Active:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.name} • {THEME_OPTIONS.find((t) => t.id === selectedTheme)?.name}
                </span>
              </div>
            </div>

            {/* Embedded Real-Time Live HTML Iframe Preview */}
            <div className="flex-1 p-3 overflow-hidden">
              <div className="w-full h-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-inner bg-[#f8fafc] dark:bg-slate-900/50">
                <iframe
                  ref={iframeRef}
                  key={`preview-${previewCategory}-${refreshKey}`}
                  srcDoc={initialHtml}
                  title="Email Live Preview"
                  className="w-full h-full border-0 bg-transparent custom-scrollbar"
                  sandbox="allow-same-origin allow-popups"
                  onLoad={() => {
                    try {
                      const iframe = iframeRef.current;
                      if (iframe) {
                        const doc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (doc && doc.body) {
                          const parser = new DOMParser();
                          const newDoc = parser.parseFromString(previewHtml, 'text/html');
                          if (doc.body.innerHTML !== newDoc.body.innerHTML) {
                            doc.body.innerHTML = newDoc.body.innerHTML;
                          }
                        }
                      }
                    } catch {}
                  }}
                />
              </div>
            </div>
          </div>
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

