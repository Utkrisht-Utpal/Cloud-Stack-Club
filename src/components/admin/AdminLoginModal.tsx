import React, { useState } from 'react';
import { Mail, KeyRound, LogIn, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminLoginModal: React.FC = () => {
  const { isAdminModalOpen, closeAdminModal, login } = useAdminAuth();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await login(emailInput, passwordInput);
      if (!result.success) {
        setError(result.error || 'Invalid Admin Email or Password. Access denied.');
      } else {
        setEmailInput('');
        setPasswordInput('');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setEmailInput('');
    setPasswordInput('');
    closeAdminModal();
  };

  return (
    <Modal isOpen={isAdminModalOpen} onClose={handleClose} title="Club Admin Access">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-sky-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span>Secure authentication powered by Supabase Auth for verified administrators.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Admin Email Address
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. admin@cuchd.in"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••••••"
                className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm border border-slate-200 dark:border-slate-700/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              icon={<LogIn className="w-4 h-4" />}
              className="w-full"
            >
              {isSubmitting ? 'Verifying...' : 'Sign In as Admin'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
