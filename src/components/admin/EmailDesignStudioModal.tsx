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
  Building2,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import type { EmailCategory } from '../../types/email';
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_INSTITUTIONAL_THEME,
  INSTITUTIONAL_PRESETS,
  type BannerStyle,
  type BannerTheme,
  type BannerTextColor,
  type EmailTemplateConfig,
  type InstitutionalThemeConfig,
} from '../../types/emailTemplate';
import {
  getAllEmailTemplates,
  applyBannerDesignToCategories,
  applyInstitutionalDesignToCategories,
  getSampleCategoryData,
  renderEmailHtmlPreview,
} from '../../services/emailTemplates';
import { useClickOutside } from '../../hooks/useClickOutside';

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

interface ColorFieldProps {
  label: string;
  description?: string;
  value?: string;
  onChange: (val: string) => void;
}

const ColorField: React.FC<ColorFieldProps> = ({ label, description, value = '#181818', onChange }) => {
  const safeValue = value || '#181818';
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
      <div className="min-w-0 flex-1">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
          {label}
        </label>
        {description && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
            {description}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-[11px] font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 uppercase text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="#000000"
        />
        <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shadow-xs flex items-center justify-center shrink-0 cursor-pointer">
          <input
            type="color"
            value={safeValue.startsWith('#') && (safeValue.length === 7 || safeValue.length === 4) ? safeValue : '#181818'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 w-12 h-12 cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full rounded-md"
            style={{ backgroundColor: safeValue }}
          />
        </div>
      </div>
    </div>
  );
};

export const EmailDesignStudioModal: React.FC<EmailDesignStudioModalProps> = ({
  isOpen,
  onClose,
  onApplied,
}) => {
  const [mounted, setMounted] = useState(false);
  // Studio sub-tab: 'standard' (Gmail/External) vs 'institutional' (CUCHD @cuchd.in)
  const [studioTab, setStudioTab] = useState<'standard' | 'institutional'>('standard');

  // Standard Banner State
  const [selectedStyle, setSelectedStyle] = useState<BannerStyle>('modern_badge');
  const [selectedTheme, setSelectedTheme] = useState<BannerTheme>('classic_blue');
  const [selectedTextColor, setSelectedTextColor] = useState<BannerTextColor>('white');
  const [previewTitle, setPreviewTitle] = useState('Cloud Stack Club');
  const [previewSubtitle, setPreviewSubtitle] = useState('Chandigarh University');

  // Institutional Custom Theme State
  const [institutionalTheme, setInstitutionalTheme] = useState<InstitutionalThemeConfig>(
    DEFAULT_INSTITUTIONAL_THEME
  );

  // Live Preview Settings
  const [previewCategory, setPreviewCategory] = useState<EmailCategory>('approval');
  const [previewFormat, setPreviewFormat] = useState<'standard' | 'institutional'>('standard');
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

  useClickOutside({
    enabled: isCategoryDropdownOpen,
    onClose: () => setIsCategoryDropdownOpen(false),
    refs: [categoryDropdownRef],
    closeOnEsc: true,
  });

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
          if (tpls.approval.institutional_theme) {
            setInstitutionalTheme(tpls.approval.institutional_theme);
          }
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
      institutional_theme: institutionalTheme,
    };
    const sampleData = getSampleCategoryData(previewCategory);
    return renderEmailHtmlPreview(baseTemplate, sampleData, previewFormat);
  }, [
    previewCategory,
    previewFormat,
    selectedStyle,
    selectedTheme,
    selectedTextColor,
    previewTitle,
    previewSubtitle,
    institutionalTheme,
  ]);

  // Initial HTML baseline (only refreshed on category change or explicit refresh, preventing srcdoc reload flash)
  const initialHtml = useMemo(() => previewHtml, [previewCategory, previewFormat, refreshKey]);

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

  const handleApplyPreset = (presetId: string) => {
    const preset = INSTITUTIONAL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setInstitutionalTheme({ ...preset.colors });
    }
  };

  const handleSwitchMode = (mode: 'standard' | 'institutional') => {
    setStudioTab(mode);
    setPreviewFormat(mode);
  };

  const handleResetInstitutionalTheme = () => {
    setInstitutionalTheme(DEFAULT_INSTITUTIONAL_THEME);
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
      if (studioTab === 'institutional') {
        await applyInstitutionalDesignToCategories(
          targets as EmailCategory[],
          institutionalTheme
        );
      } else {
        await applyBannerDesignToCategories(
          targets as EmailCategory[],
          selectedStyle,
          selectedTheme,
          selectedTextColor
        );
      }
      setAppliedCount(targets.length);
      setApplySuccess(true);
      setIsScopeModalOpen(false);
      if (onApplied) onApplied();
      setTimeout(() => {
        setApplySuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to apply design:', err);
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
                Email Design Studio
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  Universal Themes & Colors
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize branded visual layouts for Gmail and deliverability-safe solid palettes for CUCHD (@cuchd.in).
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
            {/* Top Studio Mode Selector (Standard Gmail vs CUCHD Institutional) */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('standard')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    studioTab === 'standard'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">🎨 Standard (Gmail)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('institutional')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    studioTab === 'institutional'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                  <span className="truncate">🏛️ CUCHD (@cuchd.in)</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* ================================================================= */}
              {/* TAB 1: STANDARD BRANDED (GMAIL) */}
              {/* ================================================================= */}
              {studioTab === 'standard' && (
                <>
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
                </>
              )}

              {/* ================================================================= */}
              {/* TAB 2: CUCHD INSTITUTIONAL STUDIO (@cuchd.in) */}
              {/* ================================================================= */}
              {studioTab === 'institutional' && (
                <div className="space-y-6">
                  {/* Notice: Deliverability Guarantee */}
                  <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-sky-900 dark:text-sky-200">
                      <p className="font-bold">Deliverability Safe Solid Color Engine</p>
                      <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5 leading-relaxed">
                        These solid colors are rendered with clean inline CSS without gradients to guarantee flawless inbox landing in Microsoft Exchange Online (CUCHD &amp; CUMAIL).
                      </p>
                    </div>
                  </div>

                  {/* 1. Curated 1-Click Institutional Presets */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
                        1. One-Click Color Presets ({INSTITUTIONAL_PRESETS.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleResetInstitutionalTheme}
                        className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Default</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {INSTITUTIONAL_PRESETS.map((preset) => {
                        const isSelected = institutionalTheme.preset_id === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleApplyPreset(preset.id)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {preset.name}
                                </span>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0 ml-1" />}
                              </div>
                              {/* Swatches */}
                              <div className="flex items-center gap-1.5 my-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                                  style={{ backgroundColor: preset.colors.cardBg }}
                                  title="Card Background"
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                                  style={{ backgroundColor: preset.colors.headlineColor }}
                                  title="Headline Color"
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                                  style={{ backgroundColor: preset.colors.headerSubtitleColor }}
                                  title="Accent Color"
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                                  style={{ backgroundColor: preset.colors.buttonBg }}
                                  title="Button Color"
                                />
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">
                                {preset.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Custom Color Pickers */}
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      2. Custom Palette Color Controls
                    </label>

                    {/* Section: Header & Title */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Header &amp; Title Accents
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ColorField
                          label="Header Subtitle Accent"
                          description="Institution sub-header badge"
                          value={institutionalTheme.headerSubtitleColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              headerSubtitleColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Headline / Title Color"
                          description="Main email title heading"
                          value={institutionalTheme.headlineColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              headlineColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Section: Card & Canvas Backgrounds */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Backgrounds &amp; Outlines
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <ColorField
                          label="Canvas Background"
                          description="Outer container"
                          value={institutionalTheme.canvasBg}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              canvasBg: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Card Background"
                          description="Inner mail card"
                          value={institutionalTheme.cardBg}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              cardBg: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Card Border"
                          description="Card outline"
                          value={institutionalTheme.cardBorder}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              cardBorder: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Section: Body Text */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Body Typography
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ColorField
                          label="Body / Paragraph Text"
                          description="Main content readability"
                          value={institutionalTheme.bodyTextColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              bodyTextColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Hyperlink Accent"
                          description="Text links & URL accents"
                          value={institutionalTheme.linkColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              linkColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Section: Action CTA Button */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Action CTA Button &amp; Container
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ColorField
                          label="Button Background"
                          description="Primary action button"
                          value={institutionalTheme.buttonBg}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              buttonBg: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Button Text"
                          description="Button typography"
                          value={institutionalTheme.buttonTextColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              buttonTextColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Button Box Background"
                          description="Action panel background"
                          value={institutionalTheme.buttonContainerBg}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              buttonContainerBg: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Button Box Border"
                          description="Action panel border"
                          value={institutionalTheme.buttonContainerBorder}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              buttonContainerBorder: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Section: Notice / Alert Box */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Notice &amp; Feedback Callout Box
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <ColorField
                          label="Notice Background"
                          description="Alert box background"
                          value={institutionalTheme.noticeBg}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              noticeBg: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Notice Border Accent"
                          description="Left accent border"
                          value={institutionalTheme.noticeBorder}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              noticeBorder: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Notice Text Color"
                          description="Alert box typography"
                          value={institutionalTheme.noticeTextColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              noticeTextColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Section: Footer */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Footer Signature
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ColorField
                          label="Footer Text Color"
                          description="Committee signature line"
                          value={institutionalTheme.footerTextColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              footerTextColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                        <ColorField
                          label="Footer Link Color"
                          description="Portal link accent"
                          value={institutionalTheme.footerLinkColor}
                          onChange={(val) =>
                            setInstitutionalTheme((prev) => ({
                              ...prev,
                              footerLinkColor: val,
                              preset_id: undefined,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                    : studioTab === 'institutional'
                    ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-500/25'
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
                    <span>
                      {studioTab === 'institutional'
                        ? 'Save & Apply CUCHD Palette'
                        : 'Save & Apply Header Design'}
                    </span>
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

              {/* Format Toggle + Themed Sample Template Switcher */}
              <div className="flex items-center gap-2">
                {/* Format Preview Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('standard')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      previewFormat === 'standard'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    🎨 Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('institutional')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      previewFormat === 'institutional'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    🏛️ CUCHD
                  </button>
                </div>

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
                <span className="text-slate-400 font-bold w-14">Format:</span>
                {previewFormat === 'institutional' ? (
                  <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    🏛️ CUCHD Institutional ({institutionalTheme.preset_id ? INSTITUTIONAL_PRESETS.find(p => p.id === institutionalTheme.preset_id)?.name || 'Custom Theme' : 'Custom Theme'})
                  </span>
                ) : (
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.name} • {THEME_OPTIONS.find((t) => t.id === selectedTheme)?.name}
                  </span>
                )}
              </div>
            </div>

            {/* Embedded Real-Time Live HTML Iframe Preview */}
            <div className="flex-1 p-3 overflow-hidden">
              <div className="w-full h-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-inner bg-[#f8fafc] dark:bg-slate-900/50">
                <iframe
                  ref={iframeRef}
                  key={`preview-${previewCategory}-${previewFormat}-${refreshKey}`}
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
                <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold shadow-sm ${
                  studioTab === 'institutional' ? 'bg-sky-600' : 'bg-indigo-600'
                }`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Apply Design Scope
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose which email categories receive this {studioTab === 'institutional' ? 'CUCHD institutional theme' : 'banner header design'}
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
                      Global (8 Templates)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Applies this design uniformly across all email communications (Approvals, Rejections, Inquiries, Feedback, Broadcasts, and Registrations).
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
                    Choose specific email categories to receive this theme layout.
                  </p>
                </div>
              </button>

              {/* Multi-Select Category Checklist (Shown when 'custom' is active) */}
              {scopeMode === 'custom' && (
                <div className="pl-4 pr-1 py-3 border-l-2 border-indigo-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select target email types ({selectedCategories.length}/8 selected):
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
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  studioTab === 'institutional'
                    ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-500/25'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'
                }`}
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
