import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  Save,
  Mail,
  UserCheck,
  UserX,
  MessageSquare,
  Sparkles,
  Radio,
  Eye,
  Edit3,
  Check,
  Info,
  ChevronDown,
} from 'lucide-react';
import type { EmailCategory } from '../../types/email';
import {
  CATEGORY_VARIABLES,
  DEFAULT_EMAIL_TEMPLATES,
  type EmailTemplateConfig,
} from '../../types/emailTemplate';
import {
  getAllEmailTemplates,
  saveEmailTemplate,
  resetEmailTemplate,
  getSampleCategoryData,
  renderEmailHtmlPreview,
  replaceTemplatePlaceholders,
} from '../../services/emailTemplates';

interface EmailTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_TABS: Array<{
  id: EmailCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { id: 'approval', label: 'Member Approval', icon: UserCheck, color: 'text-emerald-500' },
  { id: 'rejection', label: 'Member Rejection', icon: UserX, color: 'text-rose-500' },
  { id: 'contact_us', label: 'Contact Inquiry', icon: MessageSquare, color: 'text-blue-500' },
  { id: 'event_feedback', label: 'Feedback Review', icon: Sparkles, color: 'text-amber-500' },
  { id: 'event_broadcast', label: 'Event Broadcast', icon: Radio, color: 'text-purple-500' },
];

export const EmailTemplatesModal: React.FC<EmailTemplatesModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<Record<EmailCategory, EmailTemplateConfig>>(DEFAULT_EMAIL_TEMPLATES);
  const [activeCategory, setActiveCategory] = useState<EmailCategory>('approval');
  const [currentEdit, setCurrentEdit] = useState<EmailTemplateConfig>(DEFAULT_EMAIL_TEMPLATES.approval);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'editor' | 'preview'>('editor');
  const [includeButton, setIncludeButton] = useState(true);
  const [isBannerDropdownOpen, setIsBannerDropdownOpen] = useState(false);

  // Focus ref for variable insertion
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialLoadedRef = useRef(false);
  const bannerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset initialLoadedRef when category changes or modal reopens
  useEffect(() => {
    if (isOpen) {
      initialLoadedRef.current = false;
      setIsBannerDropdownOpen(false);
    }
  }, [isOpen, activeCategory]);

  // Click outside to close banner dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bannerDropdownRef.current && !bannerDropdownRef.current.contains(e.target as Node)) {
        setIsBannerDropdownOpen(false);
      }
    };
    if (isBannerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isBannerDropdownOpen]);

  // Lock background scrolling completely when modal is open
  useEffect(() => {
    if (isOpen) {
      const count = parseInt(document.body.dataset.modalCount || '0', 10) + 1;
      document.body.dataset.modalCount = count.toString();
      if (count === 1) {
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      }

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

  // Load templates on modal open
  useEffect(() => {
    if (isOpen) {
      getAllEmailTemplates().then((loaded) => {
        setTemplates(loaded);
        const tpl = loaded[activeCategory] || DEFAULT_EMAIL_TEMPLATES[activeCategory];
        setCurrentEdit(tpl);
        setIncludeButton(Boolean(tpl.button_text));
      });
    }
  }, [isOpen]);

  // When switching category
  const handleSelectCategory = (cat: EmailCategory) => {
    setActiveCategory(cat);
    const tpl = templates[cat] || DEFAULT_EMAIL_TEMPLATES[cat];
    setCurrentEdit({ ...tpl });
    setIncludeButton(Boolean(tpl.button_text));
    setIsBannerDropdownOpen(false);
    setSaveSuccess(false);
  };

  // Insert variable placeholder at textarea cursor
  const handleInsertVariable = (key: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setCurrentEdit((prev) => ({
        ...prev,
        body_text: prev.body_text + ' ' + key,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentEdit.body_text;
    const newText = text.substring(0, start) + key + text.substring(end);

    setCurrentEdit((prev) => ({
      ...prev,
      body_text: newText,
    }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + key.length, start + key.length);
    }, 0);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: EmailTemplateConfig = {
        ...currentEdit,
        button_text: includeButton ? currentEdit.button_text : undefined,
        button_url: includeButton ? currentEdit.button_url : undefined,
      };
      const saved = await saveEmailTemplate(payload);
      setTemplates((prev) => ({ ...prev, [saved.category]: saved }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save email template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default template
  const handleReset = async () => {
    if (window.confirm(`Reset "${CATEGORY_TABS.find((c) => c.id === activeCategory)?.label}" template back to default?`)) {
      setIsSaving(true);
      try {
        const reset = await resetEmailTemplate(activeCategory);
        setTemplates((prev) => ({ ...prev, [activeCategory]: reset }));
        setCurrentEdit({ ...reset });
        setIncludeButton(Boolean(reset.button_text));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const sampleData = getSampleCategoryData(activeCategory);
  const previewHtml = renderEmailHtmlPreview(
    {
      ...currentEdit,
      button_text: includeButton ? currentEdit.button_text : undefined,
      button_url: includeButton ? currentEdit.button_url : undefined,
    },
    sampleData
  );

  // Smooth live iframe update without white flicker
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      if (!initialLoadedRef.current || !doc.body) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
        initialLoadedRef.current = true;
      } else {
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(previewHtml, 'text/html');
        doc.title = newDoc.title;
        doc.body.innerHTML = newDoc.body.innerHTML;
      }
    } catch {
      iframe.srcdoc = previewHtml;
    }
  }, [previewHtml]);

  if (!mounted || !isOpen) return null;

  const variables = CATEGORY_VARIABLES[activeCategory] || [];

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-hidden"
    >
      <div className="w-full max-w-6xl h-[92vh] max-h-[920px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Automated Email Templates
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-sky-400">
                  Live Preview
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize automated email messages without writing any HTML or code.
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

        {/* Category Navigation Pills */}
        <div className="px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 bg-white dark:bg-slate-900">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectCategory(tab.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Sub-tabs: Editor vs Preview */}
        <div className="flex sm:hidden border-b border-slate-200 dark:border-slate-800 px-4 py-2 gap-2 shrink-0 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTabMobile('editor')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              activeTabMobile === 'editor'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Template</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTabMobile('preview')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
              activeTabMobile === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* Split Editor and Preview Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {/* LEFT: Editor Panel */}
          <div
            className={`h-full overflow-y-auto custom-scrollbar p-6 space-y-5 bg-white dark:bg-slate-900 ${
              activeTabMobile === 'preview' ? 'hidden sm:block' : 'block'
            }`}
          >
            {/* Header Banner Configuration */}
            <div ref={bannerDropdownRef} className="relative z-20">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-sky-50/50 dark:from-slate-800/60 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700/70 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Header Banner
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Customize the club headline and branding displayed on top of the email
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBannerDropdownOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isBannerDropdownOpen
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                  aria-expanded={isBannerDropdownOpen}
                  title="Customize Banner Title and Subtitle"
                >
                  <span>Edit</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isBannerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Floating Dropdown Overlay (opens on top of fields below without pushing them) */}
              {isBannerDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-30 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Header Banner Settings
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBannerDropdownOpen(false)}
                      className="text-blue-600 dark:text-sky-400 hover:underline text-xs font-bold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Banner Title
                      </label>
                      <input
                        type="text"
                        value={currentEdit.banner_title || ''}
                        onChange={(e) => setCurrentEdit((prev) => ({ ...prev, banner_title: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Cloud Stack Club"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Banner Subtitle
                      </label>
                      <input
                        type="text"
                        value={currentEdit.banner_subtitle || ''}
                        onChange={(e) => setCurrentEdit((prev) => ({ ...prev, banner_subtitle: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Chandigarh University"
                      />
                    </div>
                  </div>

                  {/* Layout Style & Color Theme Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Layout Style
                      </label>
                      <select
                        value={currentEdit.banner_style || 'modern_badge'}
                        onChange={(e) => setCurrentEdit((prev) => ({ ...prev, banner_style: e.target.value as any }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="modern_badge">✨ Glassmorphic Badge</option>
                        <option value="official_strip">🔒 Official University Strip</option>
                        <option value="minimal">⚡ Minimalist Tech</option>
                        <option value="classic">🎨 Classic Gradient</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Color Theme
                      </label>
                      <select
                        value={currentEdit.banner_theme || 'classic_blue'}
                        onChange={(e) => setCurrentEdit((prev) => ({ ...prev, banner_theme: e.target.value as any }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="classic_blue">🔵 CSC Royal Blue</option>
                        <option value="emerald_tech">🟢 Emerald Tech</option>
                        <option value="cosmic_purple">🟣 Cosmic Purple</option>
                        <option value="ruby_crimson">🔴 Ruby Crimson</option>
                        <option value="midnight_slate">⚫ Midnight Slate</option>
                        <option value="sunset_amber">🌅 Sunset Amber</option>
                        <option value="cyberpunk_neon">⚡ Cyberpunk Neon</option>
                        <option value="oceanic_teal">🌊 Oceanic Teal</option>
                        <option value="gold_luxury">👑 Gold Luxury</option>
                        <option value="aurora_green">🌌 Aurora Borealis</option>
                        <option value="solar_flare">☀️ Solar Flare</option>
                        <option value="obsidian_mono">⬛ Obsidian Monolith</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Email Subject Line
              </label>
              <input
                type="text"
                value={currentEdit.subject}
                onChange={(e) => setCurrentEdit((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Subject shown in recipient's inbox..."
              />
            </div>

            {/* Headline / Greeting */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Headline / Card Title
              </label>
              <input
                type="text"
                value={currentEdit.headline}
                onChange={(e) => setCurrentEdit((prev) => ({ ...prev, headline: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Big title in email card..."
              />
            </div>

            {/* Variable Placeholders Helper */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 dark:text-sky-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Click to insert placeholder tags:
                </span>
                <span className="text-[10px] text-blue-500/80">Auto-fills student data</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleInsertVariable(v.key)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all cursor-pointer shadow-xs"
                    title={`${v.label} (e.g. "${v.sampleValue}")`}
                  >
                    + {v.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Message Body */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Message Body Content
              </label>
              <textarea
                ref={bodyTextareaRef}
                rows={7}
                value={currentEdit.body_text}
                onChange={(e) => setCurrentEdit((prev) => ({ ...prev, body_text: e.target.value }))}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar leading-relaxed resize-y"
                placeholder="Write your email body normally. Separate paragraphs with a blank line..."
              />
              <p className="text-[11px] text-slate-500">
                Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Enter</kbd> twice to create a new clean paragraph.
              </p>
            </div>

            {/* Action Button Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Call-to-Action Button
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Include a clickable action button in this email
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeButton}
                  onChange={(e) => setIncludeButton(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {includeButton && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={currentEdit.button_text || ''}
                      onChange={(e) => setCurrentEdit((prev) => ({ ...prev, button_text: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Visit Portal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Target URL
                    </label>
                    <input
                      type="text"
                      value={currentEdit.button_url || ''}
                      onChange={(e) => setCurrentEdit((prev) => ({ ...prev, button_url: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Notice / Text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Footer Disclaimer / Notice
              </label>
              <textarea
                rows={2}
                value={currentEdit.footer_text || ''}
                onChange={(e) => setCurrentEdit((prev) => ({ ...prev, footer_text: e.target.value }))}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar leading-relaxed resize-y"
                placeholder="This is an official communication from Cloud Stack Club..."
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Revert back to system default template"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to Default</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 ${
                  saveSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved Successfully!</span>
                  </>
                ) : isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Real-Time Preview Panel */}
          <div
            className={`h-full flex flex-col bg-slate-100/70 dark:bg-slate-950/60 overflow-hidden ${
              activeTabMobile === 'editor' ? 'hidden sm:flex' : 'flex'
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
              <span className="text-[10px] font-mono text-slate-400">
                Sample Student View
              </span>
            </div>

            {/* Email Metadata Header Preview */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold w-14">From:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Cloud Stack Club <span className="text-slate-400">&lt;cloudstackclub@cumail.in&gt;</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold w-14">Subject:</span>
                <span className="font-bold text-blue-600 dark:text-sky-400">
                  {replaceTemplatePlaceholders(currentEdit.subject, sampleData) || 'No Subject'}
                </span>
              </div>
            </div>

            {/* Embedded Live HTML Preview */}
            <div className="flex-1 p-3 overflow-hidden">
              <div className="w-full h-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-inner bg-slate-900">
                <iframe
                  ref={iframeRef}
                  title="Email Live Preview"
                  className="w-full h-full border-0 bg-transparent custom-scrollbar"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
