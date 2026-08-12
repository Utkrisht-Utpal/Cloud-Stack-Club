import React, { useState } from 'react';
import { Sparkles, User, Mail, GraduationCap, Phone, Building2, Calendar, Upload, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';
import { registerForEvent, uploadRegistrationFile } from '../../services/supabase';

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

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit registration payload to Supabase database
      const regResult = await registerForEvent({
        event_id: 'membership-application',
        registrant_name: formData.name.trim(),
        registrant_email: formData.email.trim(),
        registrant_phone: formData.phone.trim() || undefined,
        uid: formData.uid.trim(),
        is_member: false,
        answers: [
          { field_id: 'department', answer_text: formData.department },
          { field_id: 'year', answer_text: formData.year },
        ],
      });

      // Upload verification file if attached
      if (verificationFile && regResult?.id) {
        const uploadedFilePath = await uploadRegistrationFile(
          'membership-application-2026',
          regResult.id,
          verificationFile
        );
        console.log('Verification file uploaded to Supabase:', uploadedFilePath);
      }

      setRegisteredNumber(regResult.registration_number);
      onSuccessToast();
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setError(err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setRegisteredNumber(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      uid: '',
      department: 'Computer Science & Engineering (CSE)',
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Application Submitted!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Your application has been logged into the Cloud Stack Club database.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-center">
              <span className="text-xs text-slate-500 block uppercase">Registration ID</span>
              <span className="text-base font-extrabold text-blue-600 dark:text-sky-400 mt-0.5 block">{registeredNumber}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Your uploaded verification file will be safely deleted automatically upon membership approval.
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
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
                    placeholder="e.g. rahul@cumail.in"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                  CU Student UID / EID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.uid}
                  onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                  placeholder="e.g. 24BCF10003"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                    Department / Branch *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. CSE / AI & ML / MCA"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
                  />
                </div>

                <CustomSelect
                  label="Year of Study"
                  icon={<Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />}
                  value={formData.year}
                  onChange={(val) => setFormData({ ...formData, year: val })}
                  options={YEAR_OPTIONS}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                  CUIMS Verification Screenshot / Document
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-sky-400 hover:file:bg-blue-200 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Verification files are deleted automatically upon membership approval.
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
