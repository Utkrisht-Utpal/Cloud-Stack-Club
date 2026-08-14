import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Mail, GraduationCap, Phone, Building2, Calendar, Upload, Send, AlertCircle, CheckCircle2, HelpCircle, X, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';
import { submitMemberApplication, checkMemberDuplicate } from '../../services/supabase';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: () => void;
}

const YEAR_OPTIONS = [
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
];

export const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose, onSuccessToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    uid: '',
    department: '',
    year: '1st Year',
  });
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredNumber, setRegisteredNumber] = useState<string | null>(null);
  const [showCuimsHelp, setShowCuimsHelp] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10 MB.');
        return;
      }
      setVerificationFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.uid) return;

    // Enforce required CUIMS verification document upload
    if (!verificationFile) {
      setError('CUIMS verification screenshot or document is required to apply for membership.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Check for duplicates in UID, Email, or Mobile Number before attempting registration
      const dupCheck = await checkMemberDuplicate(formData.uid, formData.email, formData.phone);
      if (dupCheck.isDuplicate) {
        setError(dupCheck.message || `A member with this ${dupCheck.field} already exists.`);
        setIsSubmitting(false);
        return;
      }

      // 2. Submit membership application payload DIRECTLY into Supabase `members` table ONLY
      const newMember = await submitMemberApplication(
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          uid: formData.uid.trim(),
          department: formData.department.trim() || undefined,
          year: formData.year,
        },
        verificationFile
      );

      setRegisteredNumber(newMember.registration_id);
      onSuccessToast();
    } catch (err: any) {
      console.error('Membership application submission error:', err);
      setError(err?.message || 'Failed to submit membership application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setRegisteredNumber(null);
    setShowCuimsHelp(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      uid: '',
      department: '',
      year: '1st Year',
    });
    setVerificationFile(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Join Cloud Stack Club">
      <div className="space-y-4">
        {registeredNumber ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Membership Application Submitted!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                We will let you know after successful verification of your membership registration.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-center">
              <span className="text-xs text-slate-500 block uppercase">Member Registration ID</span>
              <span className="text-base font-extrabold text-blue-600 dark:text-sky-400 mt-0.5 block">{registeredNumber}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Your uploaded verification document will be safely deleted automatically upon membership approval by the admin.
            </p>
            <Button variant="primary" size="md" className="w-full mt-2" onClick={handleModalClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-sky-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
              <span>Apply for membership in Chandigarh University's premier cloud developer network.</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                    Student Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="@example.com"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                  University ID (UID) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.uid}
                  onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                  placeholder="University ID (UID)"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                />
              </div>

              {/* Department & Year of Study Pill Grid with Equal Height */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                    Department / Branch *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. CSE / AI & ML / MCA"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                  />
                </div>

                <CustomSelect
                  label="Year of Study"
                  icon={<Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />}
                  value={formData.year}
                  onChange={(val) => setFormData({ ...formData, year: val })}
                  options={YEAR_OPTIONS}
                  triggerClassName="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white flex items-center justify-between transition-all duration-300 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                />
              </div>

              {/* Verification File Upload Header & Side Popover Trigger */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                    <span>CUIMS VERIFICATION SCREENSHOT *</span>
                  </label>

                  {/* Wrapper: Handles mouse enter/leave for smooth open & auto-close */}
                  <div
                    className="relative inline-block"
                    onMouseEnter={() => setShowCuimsHelp(true)}
                    onMouseLeave={() => setShowCuimsHelp(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setShowCuimsHelp(!showCuimsHelp)}
                      className="px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-blue-100/90 dark:hover:bg-blue-500/25 hover:text-blue-600 dark:hover:text-sky-400 transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-sky-400" />
                      <span className="whitespace-nowrap font-medium">How to get screenshot?</span>
                    </button>

                    {/* Popover Menu opening vertically centered to the RIGHT SIDE */}
                    <AnimatePresence>
                      {showCuimsHelp && (
                        <motion.div
                          initial={{ opacity: 0, x: -8, scale: 0.96 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute sm:left-full sm:top-1/2 sm:-translate-y-1/2 sm:ml-3 right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl z-[9999] text-left space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                              <span>🚨</span>
                              <span>How to Get CUIMS Screenshot</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCuimsHelp(false)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                            Attention Everyone! Complete your club registration on CUIMS:
                          </p>

                          <ol className="text-[11px] text-slate-800 dark:text-slate-200 space-y-1.5 list-decimal list-inside font-semibold bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <li>
                              Open <strong>CUIMS</strong> (
                              <a
                                href="https://uims.cuchd.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-sky-400 hover:underline font-mono font-bold inline-flex items-center gap-0.5"
                              >
                                uims.cuchd.in
                                <ExternalLink className="w-3 h-3 inline" />
                              </a>
                              )
                            </li>
                            <li>Go to <strong>Student Relation Management System</strong></li>
                            <li>Select <strong>Club & Society</strong></li>
                            <li>Click on <strong>Register Entity</strong></li>
                            <li>Search for <strong>Cloud Stack Club</strong></li>
                            <li>Click <strong>Join</strong> and take a screenshot!</li>
                          </ol>

                          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                            Upload the screenshot here. Verification files are deleted automatically upon membership approval by admin.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <input
                  type="file"
                  required
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full h-11 px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-sky-400 hover:file:bg-blue-200 cursor-pointer"
                />

                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Verification files are deleted automatically upon membership approval by admin.
                </span>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  icon={<Send className="w-4 h-4" />}
                  className="w-full"
                >
                  {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};
