import React, { useState } from 'react';
import { Sparkles, User, Mail, GraduationCap, Code2, Send, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';
import { sendJoinApplication } from '../../services/emailService';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: () => void;
}

const DOMAIN_OPTIONS = [
  { value: 'Cloud Computing', label: 'Cloud Computing' },
  { value: 'Full Stack Development', label: 'Full Stack Development' },
  { value: 'DevOps', label: 'DevOps' },
  { value: 'Web Development', label: 'Web Development' },
  { value: 'Docker & Kubernetes', label: 'Docker & Kubernetes' },
  { value: 'AI + Cloud', label: 'AI + Cloud' },
];

export const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose, onSuccessToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    uid: '',
    domain: 'Cloud Computing',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.uid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await sendJoinApplication(formData);
      setFormData({ name: '', email: '', uid: '', domain: 'Cloud Computing' });
      onClose();
      onSuccessToast();
    } catch {
      setError('Failed to send. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Cloud Stack Club">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-sky-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span>Become a member of Chandigarh University's premier cloud developer network.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ronak Sharma"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. ronaksh1@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              UID / Student ID
            </label>
            <input
              type="text"
              required
              value={formData.uid}
              onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
              placeholder="e.g. 22BCS10101"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
            />
          </div>

          {/* UI Friendly Custom Glassmorphic Select Dropdown (Image 4 Requirement) */}
          <CustomSelect
            label="Primary Domain Interest"
            icon={<Code2 className="w-3.5 h-3.5 text-sky-400" />}
            value={formData.domain}
            onChange={(val) => setFormData({ ...formData, domain: val })}
            options={DOMAIN_OPTIONS}
          />

          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              icon={<Send className="w-4 h-4" />}
              className="w-full"
            >
              {isSubmitting ? 'Sending Application...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
