import React from 'react';
import {
  Bell,
  Sparkles,
  Flame,
  Info,
  ExternalLink,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { Notice, NoticeType } from '../../types/database';
import { formatEventDate } from '../../utils/formatters';

interface NoticeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice | null;
}

const NOTICE_STYLE_CONFIG: Record<
  NoticeType,
  {
    label: string;
    icon: any;
    accentGradient: string;
    surfaceBg: string;
    cardBorder: string;
    iconContainer: string;
    badgePill: string;
    buttonGradient: string;
    buttonShadow: string;
  }
> = {
  urgent: {
    label: 'Urgent Alert',
    icon: Flame,
    accentGradient: 'from-rose-500 via-red-500 to-amber-500',
    surfaceBg: 'bg-rose-500/[0.04] dark:bg-rose-500/[0.08]',
    cardBorder: 'border-rose-500/20 dark:border-rose-500/30',
    iconContainer: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
    badgePill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    buttonGradient: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
    buttonShadow: 'shadow-blue-500/25 hover:shadow-blue-500/35',
  },
  announcement: {
    label: 'Club Announcement',
    icon: Bell,
    accentGradient: 'from-blue-500 via-indigo-500 to-cyan-500',
    surfaceBg: 'bg-blue-500/[0.04] dark:bg-blue-500/[0.08]',
    cardBorder: 'border-blue-500/20 dark:border-blue-500/30',
    iconContainer: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-sky-400',
    badgePill: 'bg-blue-500/10 text-blue-600 dark:text-sky-400 border-blue-500/20',
    buttonGradient: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
    buttonShadow: 'shadow-blue-500/25 hover:shadow-blue-500/35',
  },
  event: {
    label: 'Special Event Alert',
    icon: Sparkles,
    accentGradient: 'from-purple-500 via-pink-500 to-rose-500',
    surfaceBg: 'bg-purple-500/[0.04] dark:bg-purple-500/[0.08]',
    cardBorder: 'border-purple-500/20 dark:border-purple-500/30',
    iconContainer: 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400',
    badgePill: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    buttonGradient: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
    buttonShadow: 'shadow-blue-500/25 hover:shadow-blue-500/35',
  },
  info: {
    label: 'Information Bulletin',
    icon: Info,
    accentGradient: 'from-amber-500 via-orange-500 to-yellow-500',
    surfaceBg: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]',
    cardBorder: 'border-amber-500/20 dark:border-amber-500/30',
    iconContainer: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    badgePill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    buttonGradient: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
    buttonShadow: 'shadow-blue-500/25 hover:shadow-blue-500/35',
  },
};

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({
  isOpen,
  onClose,
  notice,
}) => {
  if (!notice) return null;

  const style =
    NOTICE_STYLE_CONFIG[notice.type] || NOTICE_STYLE_CONFIG.announcement;
  const Icon = style.icon;

  const isExternal =
    notice.link_url?.startsWith('http://') ||
    notice.link_url?.startsWith('https://');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Club Notice Bulletin"
      maxWidth="max-w-lg"
      hideCloseButton={true}
    >
      <div className="space-y-4">
        {/* Notice Presentation Card */}
        <div
          className={`relative rounded-3xl p-5 sm:p-6 ${style.surfaceBg} border ${style.cardBorder} overflow-hidden shadow-sm transition-all`}
        >
          {/* Top hairline accent gradient bar */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.accentGradient}`}
          />

          {/* Soft ambient corner light effect */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Header: Icon Avatar + Badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl ${style.iconContainer} border flex items-center justify-center shrink-0 shadow-sm`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${style.badgePill}`}
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                    </span>
                    <span>{style.label}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-slate-700/60 shrink-0 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>
                  {formatEventDate(notice.updated_at || notice.created_at)}
                </span>
              </div>
            </div>

            {/* Notice Title */}
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                {notice.title}
              </h3>
            </div>

            {/* Content Details (if body exists) */}
            {notice.content && (
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium shadow-xs">
                {notice.content}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            Close
          </button>

          {notice.link_url && (
            <a
              href={notice.link_url}
              target="_self"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl ${style.buttonGradient} text-white text-xs font-bold transition-all shadow-md ${style.buttonShadow} hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap`}
              onClick={onClose}
            >
              <span>{notice.link_text || 'Open Link'}</span>
              {isExternal ? (
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              )}
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
};
