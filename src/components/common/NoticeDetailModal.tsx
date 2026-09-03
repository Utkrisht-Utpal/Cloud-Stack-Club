import React from 'react';
import {
  Bell,
  Sparkles,
  Flame,
  Info,
  ExternalLink,
  ArrowRight,
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
    headerBg: string;
    pillBg: string;
    pillText: string;
    pillBorder: string;
  }
> = {
  urgent: {
    label: 'Urgent Alert',
    icon: Flame,
    headerBg: 'from-red-600 to-rose-700',
    pillBg: 'bg-red-500/20',
    pillText: 'text-red-700 dark:text-red-300',
    pillBorder: 'border-red-500/40',
  },
  announcement: {
    label: 'Club Announcement',
    icon: Bell,
    headerBg: 'from-blue-600 to-indigo-700',
    pillBg: 'bg-blue-500/20',
    pillText: 'text-blue-700 dark:text-sky-300',
    pillBorder: 'border-blue-500/40',
  },
  event: {
    label: 'Special Event Alert',
    icon: Sparkles,
    headerBg: 'from-purple-600 to-pink-700',
    pillBg: 'bg-purple-500/20',
    pillText: 'text-purple-700 dark:text-purple-300',
    pillBorder: 'border-purple-500/40',
  },
  info: {
    label: 'Information Bulletin',
    icon: Info,
    headerBg: 'from-amber-600 to-orange-700',
    pillBg: 'bg-amber-500/20',
    pillText: 'text-amber-700 dark:text-amber-300',
    pillBorder: 'border-amber-500/40',
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
    >
      <div className="space-y-4">
        {/* Banner Card */}
        <div
          className={`p-5 rounded-2xl bg-gradient-to-br ${style.headerBg} text-white relative overflow-hidden shadow-lg`}
        >
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                <Icon className="w-3 h-3" />
                {style.label}
              </span>
              <span className="text-[10px] font-bold text-white/80">
                {formatEventDate(notice.updated_at || notice.created_at)}
              </span>
            </div>

            <h3 className="text-lg font-black tracking-tight leading-snug">
              {notice.title}
            </h3>
          </div>

          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Content Details */}
        {notice.content ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
            {notice.content}
          </div>
        ) : null}

        {/* Action Link Button */}
        {notice.link_url && (
          <div className="pt-2">
            <a
              href={notice.link_url}
              target={isExternal ? '_blank' : '_self'}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35"
              onClick={onClose}
            >
              <span>{notice.link_text || 'Open Link / Details'}</span>
              {isExternal ? (
                <ExternalLink className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};
