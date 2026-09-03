import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';
import { TurnstileWidget, resetTurnstile } from './TurnstileWidget';
import { useSubmitCooldown } from '../../hooks/useSubmitCooldown';
import { submitDiscrepancy, type Discrepancy } from '../../services/discrepancies';
import { getActiveNotices } from '../../services/notices';

interface DiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: () => void;
}

const YEAR_OPTIONS = [
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
];

export const DiscrepancyModal: React.FC<DiscrepancyModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const { cooldown, isCoolingDown, startCooldown, resetCooldown } = useSubmitCooldown(9);
  const [activeNoticeDesc, setActiveNoticeDesc] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getActiveNotices()
      .then((notices) => {
        if (!isMounted) return;
        const currentNotice = notices && notices.length > 0 ? notices[0] : null;
        const desc = currentNotice?.content || (currentNotice as any)?.description || null;
        if (desc && typeof desc === 'string' && desc.trim()) {
          setActiveNoticeDesc(desc.trim());
        } else {
          setActiveNoticeDesc(null);
        }
      })
      .catch(() => {
        if (isMounted) setActiveNoticeDesc(null);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    uid: '',
    department: '',
    year: '1st Year',
    description: '',
    honeypot: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<Discrepancy | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  const triggerErrorWithCooldown = (msg: string) => {
    setError(msg);
    setTurnstileToken('');
    resetTurnstile();
    startCooldown(9);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCoolingDown || isSubmitting) return;
    setError(null);

    // Basic Validations
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      triggerErrorWithCooldown('Please fill in your Name, Email, and Phone number.');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.trim())) {
      triggerErrorWithCooldown('Phone number must be exactly 10 digits.');
      return;
    }

    if (!formData.department.trim()) {
      triggerErrorWithCooldown('Please specify your Department / Branch.');
      return;
    }

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      triggerErrorWithCooldown('Please complete the Cloudflare anti-bot security check.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitDiscrepancy({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        uid: formData.uid || undefined,
        department: formData.department,
        year_of_study: formData.year,
        description: formData.description || undefined,
        honeypot: formData.honeypot,
        turnstileToken: turnstileToken.trim(),
      });

      setSubmittedTicket(result);
      resetCooldown();
      if (onSuccessToast) onSuccessToast();
    } catch (err: any) {
      console.error('Discrepancy submission error:', err);
      triggerErrorWithCooldown(
        err?.message || 'Failed to submit query. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTicket = () => {
    if (submittedTicket?.ticket_number) {
      navigator.clipboard.writeText(submittedTicket.ticket_number);
      setCopiedTicket(true);
      setTimeout(() => setCopiedTicket(false), 2000);
    }
  };

  const handleModalClose = () => {
    setSubmittedTicket(null);
    setError(null);
    setTurnstileToken('');
    setFormData({
      name: '',
      email: '',
      phone: '',
      uid: '',
      department: '',
      year: '1st Year',
      description: '',
      honeypot: '',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={submittedTicket ? 'Query Submitted Successfully' : 'Club Discrepancy Form'}
      hideCloseButton={true}
      maxWidth="max-w-xl"
    >
      <AnimatePresence mode="wait">
        {submittedTicket ? (
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-4 space-y-5"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Query Registered Successfully!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Thank you, <span className="font-bold text-slate-800 dark:text-slate-200">{submittedTicket.name}</span>. Our coordinators and technical administrators will review your request and resolve any CUIMS registration blocks.
              </p>
            </div>

            {/* Ticket Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 max-w-sm mx-auto space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your Reference Ticket Number
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-base font-black text-blue-600 dark:text-sky-400 tracking-wider">
                  {submittedTicket.ticket_number}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTicket}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                  title="Copy Ticket ID"
                >
                  {copiedTicket ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Save this ticket number for communication with club executives.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleModalClose}
                className="w-full sm:w-auto px-8"
              >
                Done & Close
              </Button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header info notice: ONLY shown if currently active notice has a non-empty description */}
            {activeNoticeDesc && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed whitespace-pre-wrap">{activeNoticeDesc}</p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Hidden honeypot field for bot mitigation */}
            <input
              type="text"
              name="website_url"
              value={formData.honeypot}
              onChange={(e) => setFormData((prev) => ({ ...prev, honeypot: e.target.value }))}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Row 1: Full Name & University UID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Ravi Kishan"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  University ID (UID)
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.uid}
                    onChange={(e) => setFormData((prev) => ({ ...prev, uid: e.target.value.toUpperCase() }))}
                    placeholder="e.g. 24BCF1000X"
                    maxLength={10}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Email & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="student@gmail.in"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Enter 10 Digit Phone Number"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Department / Branch & Year of Study */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Department / Branch <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. AIT - CSE / FullStack Development"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Year of Study <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <CustomSelect
                    value={formData.year}
                    onChange={(val) => setFormData((prev) => ({ ...prev, year: val }))}
                    options={YEAR_OPTIONS}
                    triggerClassName="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Description / Query Details */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Describe Your Issue / Query (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Currently registered in another club on CUIMS, request deregistration to join CloudStack Club."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Cloudflare Turnstile & Actions Footer */}
            <div className="space-y-2 pt-1">
              <TurnstileWidget
                className="flex justify-center my-0"
                onVerify={(token) => setTurnstileToken(token)}
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs font-bold transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCoolingDown}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-row items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Submitting...</span>
                    </>
                  ) : isCoolingDown ? (
                    <>
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Wait {cooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span>Submit Query</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </AnimatePresence>
    </Modal>
  );
};
