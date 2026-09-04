import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowUpRight, Check, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LinkedinIcon } from '../ui/SocialIcons';
import { formatLinkedInUrl, formatLinkedInDisplay } from '../../utils/formatters';

interface EditMemberSocialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  memberRole?: string | null;
  initialLinkedinUrl?: string | null;
  initialLinkedinText?: string | null;
  onSave: (payload: { linkedin_url: string | null; linkedin_text: string | null }) => Promise<void>;
}

export const EditMemberSocialsModal: React.FC<EditMemberSocialsModalProps> = ({
  isOpen,
  onClose,
  memberName,
  memberRole,
  initialLinkedinUrl,
  initialLinkedinText,
  onSave,
}) => {
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [linkedinText, setLinkedinText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLinkedinUrl(initialLinkedinUrl || '');
      setLinkedinText(initialLinkedinText || '');
      setError(null);
    }
  }, [initialLinkedinUrl, initialLinkedinText, isOpen]);

  // Derive preview URL & preview text dynamically
  const normalizedUrl = formatLinkedInUrl(linkedinUrl);
  const defaultDisplayText = formatLinkedInDisplay(linkedinUrl);
  const effectiveDisplayText = linkedinText.trim() || defaultDisplayText;

  const handleUrlBlur = () => {
    // If display text is empty, auto-populate with formatted handle
    if (!linkedinText.trim() && linkedinUrl.trim()) {
      setLinkedinText(defaultDisplayText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const cleanUrl = linkedinUrl.trim();
    const cleanText = linkedinText.trim();

    if (cleanUrl) {
      const fullUrl = formatLinkedInUrl(cleanUrl);
      if (!fullUrl.includes('linkedin.com/')) {
        setError('Please enter a valid LinkedIn URL or profile username.');
        setIsSaving(false);
        return;
      }
    }

    try {
      await onSave({
        linkedin_url: cleanUrl ? formatLinkedInUrl(cleanUrl) : null,
        linkedin_text: cleanUrl ? (cleanText || defaultDisplayText) : null,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving socials:', err);
      setError(err?.message || 'Failed to save social links.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        linkedin_url: null,
        linkedin_text: null,
      });
      setLinkedinUrl('');
      setLinkedinText('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove social links.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Member Socials — ${memberName}`}
      maxWidth="max-w-lg sm:max-w-xl"
      hideCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Member Meta Header Banner */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-sky-400" />
          <span className="font-extrabold text-slate-900 dark:text-white">
            {memberName}
          </span>
          {memberRole && (
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              • {memberRole}
            </span>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* LinkedIn URL Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <LinkedinIcon className="w-4 h-4 text-[#0a66c2] shrink-0" />
            <span>LinkedIn Profile URL or Handle</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://linkedin.com/in/username or in/username"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Display Text in Popup Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Text to Show in Profile Popup</span>
            {defaultDisplayText && !linkedinText && (
              <button
                type="button"
                onClick={() => setLinkedinText(defaultDisplayText)}
                className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer font-semibold"
              >
                Use "{defaultDisplayText}"
              </button>
            )}
          </label>
          <input
            type="text"
            value={linkedinText}
            onChange={(e) => setLinkedinText(e.target.value)}
            placeholder={defaultDisplayText || 'e.g. in/dr-deepti-sharma or LinkedIn Profile'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Label shown next to the LinkedIn icon on member cards & in the details popup.
          </p>
        </div>

        {/* Live Visual Preview */}
        {linkedinUrl.trim() && (
          <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Live Preview in Meet Our Team Popup
            </span>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200/60 dark:border-blue-500/30 text-xs sm:text-sm font-semibold text-blue-700 dark:text-sky-300 shadow-xs">
                <LinkedinIcon className="w-4 h-4 shrink-0 text-[#0a66c2] dark:text-[#0077b5]" />
                <span>{effectiveDisplayText}</span>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              </div>

              {normalizedUrl && (
                <a
                  href={normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Test link in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            {(initialLinkedinUrl || initialLinkedinText) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving}
                className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Link</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Check className="w-3.5 h-3.5 shrink-0" />}
              iconPosition="left"
              disabled={isSaving}
              className="whitespace-nowrap font-bold"
            >
              {isSaving ? 'Saving...' : 'Save Socials'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

