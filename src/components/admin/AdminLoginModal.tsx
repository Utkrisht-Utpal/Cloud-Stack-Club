import React, { useState } from 'react';
import { Mail, KeyRound, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Turnstile } from '../ui/Turnstile';
import { useAdminAuth } from '../../context/AdminAuthContext';

const TURNSTILE_SITE_KEY = '0x4AAAAAAEfcbJ_vtTz3UYYd';

export const AdminLoginModal: React.FC = () => {
  const { isAdminModalOpen, closeAdminModal, login } = useAdminAuth();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;

    if (!captchaToken) {
      setError('Please complete the Cloudflare security verification.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await login(emailInput, passwordInput, captchaToken);
      if (!result.success) {
        setError(result.error || 'Invalid Admin Email or Password. Access denied.');
      } else {
        setEmailInput('');
        setPasswordInput('');
        setCaptchaToken(null);
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
    setCaptchaToken(null);
    closeAdminModal();
  };

  return (
    <Modal isOpen={isAdminModalOpen} onClose={handleClose} title="Club Admin Access">
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>Admin Email Address <span className="text-red-500">*</span></span>
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
              <span>Password <span className="text-red-500">*</span></span>
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

          {/* Cloudflare Turnstile Verification Widget */}
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center min-h-[75px]">
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={(token) => {
                setCaptchaToken(token);
                if (error && error.includes('Cloudflare')) setError(null);
              }}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setError('Captcha verification failed. Please try again.')}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-1">
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
