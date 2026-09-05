import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  AlertTriangle,
  Info,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Flame,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Toast } from '../ui/Toast';
import {
  getAllNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} from '../../services/notices';
import type { Notice, NoticeType } from '../../types/database';

interface NoticeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoticeUpdated?: () => void;
}

const NOTICE_TYPE_CONFIG: Record<
  NoticeType,
  {
    label: string;
    icon: any;
    bg: string;
    text: string;
    border: string;
    activeBorder: string;
    activeRing: string;
  }
> = {
  urgent: {
    label: 'Urgent',
    icon: Flame,
    bg: 'bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/30',
    activeBorder: 'border-red-500 dark:border-red-400',
    activeRing: 'ring-2 ring-red-500/40 shadow-red-500/10',
  },
  announcement: {
    label: 'Announcement',
    icon: Bell,
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-sky-400',
    border: 'border-blue-500/30',
    activeBorder: 'border-blue-500 dark:border-sky-400',
    activeRing: 'ring-2 ring-blue-500/40 shadow-blue-500/10',
  },
  event: {
    label: 'Event Alert',
    icon: Sparkles,
    bg: 'bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    activeBorder: 'border-purple-500 dark:border-purple-400',
    activeRing: 'ring-2 ring-purple-500/40 shadow-purple-500/10',
  },
  info: {
    label: 'Info',
    icon: Info,
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    activeBorder: 'border-amber-500 dark:border-amber-400',
    activeRing: 'ring-2 ring-amber-500/40 shadow-amber-500/10',
  },
};

export const NoticeManagementModal: React.FC<NoticeManagementModalProps> = ({
  isOpen,
  onClose,
  onNoticeUpdated,
}) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoticeType>('announcement');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingNotice, setDeletingNotice] = useState<Notice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const data = await getAllNotices();
      setNotices(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotices();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType('announcement');
    setLinkUrl('');
    setLinkText('');
    setIsActive(true);
    setEditingNotice(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content || '');
    setType(notice.type);
    setLinkUrl(notice.link_url || '');
    setLinkText(notice.link_text || '');
    setIsActive(notice.is_active);
    setIsFormOpen(true);
    setError(null);
  };

  const handleToggleStatus = async (notice: Notice) => {
    const nextActive = !notice.is_active;
    // Optimistic instant UI update
    setNotices((prev) =>
      prev.map((n) => (n.id === notice.id ? { ...n, is_active: nextActive } : n))
    );
    try {
      const res = await updateNotice(notice.id, { is_active: nextActive });
      if (res.success) {
        if (res.data) {
          setNotices((prev) =>
            prev.map((n) => (n.id === notice.id ? { ...n, ...res.data! } : n))
          );
        }
        onNoticeUpdated?.();
        setToastMsg({ text: 'Notice status updated!', type: 'success' });
      } else {
        // Rollback on failure
        setNotices((prev) =>
          prev.map((n) => (n.id === notice.id ? { ...n, is_active: notice.is_active } : n))
        );
        setError(res.error || 'Failed to update status.');
      }
    } catch {
      setNotices((prev) =>
        prev.map((n) => (n.id === notice.id ? { ...n, is_active: notice.is_active } : n))
      );
      setError('Failed to toggle notice status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingNotice) return;
    const deletedTitle = deletingNotice.title;
    setIsDeleting(true);
    try {
      const res = await deleteNotice(deletingNotice.id);
      if (res.success) {
        setNotices((prev) => prev.filter((n) => n.id !== deletingNotice.id));
        setDeletingNotice(null);
        onNoticeUpdated?.();
        setToastMsg({ text: `Notice "${deletedTitle}" deleted.`, type: 'success' });
      } else {
        setError(res.error || 'Failed to delete notice.');
      }
    } catch {
      setError('Failed to delete notice.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a notice title.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingNotice) {
        const res = await updateNotice(editingNotice.id, {
          title: title.trim(),
          content: content.trim() || null,
          type,
          link_url: linkUrl.trim() || null,
          link_text: linkText.trim() || null,
          is_active: isActive,
        });

        if (res.success && res.data) {
          setNotices((prev) =>
            prev.map((n) => (n.id === editingNotice.id ? res.data! : n))
          );
          resetForm();
          onNoticeUpdated?.();
          setToastMsg({ text: 'Notice updated successfully!', type: 'success' });
        } else {
          setError(res.error || 'Failed to update notice.');
        }
      } else {
        const res = await createNotice({
          title: title.trim(),
          content: content.trim() || null,
          type,
          link_url: linkUrl.trim() || null,
          link_text: linkText.trim() || null,
          is_active: isActive,
        });

        if (res.success && res.data) {
          setNotices((prev) => [res.data!, ...prev]);
          resetForm();
          onNoticeUpdated?.();
          setToastMsg({ text: 'Notice created successfully!', type: 'success' });
        } else {
          setError(res.error || 'Failed to create notice.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. Main Notice Board Management Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Club Notice Board Management"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Header Description & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Live Hanging Notice Board
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Published active notices replace the university subtitle in the navbar with a live alert.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenCreate}
              className="shrink-0 cursor-pointer"
            >
              Post New Notice
            </Button>
          </div>

          {error && !isFormOpen && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Notices List (Scrollable without visible scrollbar when > 3 notices) */}
          <div className="space-y-2.5 max-h-[310px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading notices...
              </div>
            ) : notices.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No notices created yet. Click <strong>"Post New Notice"</strong> to create one.
              </div>
            ) : (
              notices.map((notice) => {
                const cfg = NOTICE_TYPE_CONFIG[notice.type] || NOTICE_TYPE_CONFIG.announcement;
                const Icon = cfg.icon;
                return (
                  <div
                    key={notice.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      notice.is_active
                        ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        {notice.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Live in Navbar
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {notice.title}
                      </h5>

                      {notice.content && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                          {notice.content}
                        </p>
                      )}

                      {notice.link_url && (
                        <div className="pt-0.5">
                          <a
                            href={notice.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline"
                          >
                            <span>{notice.link_text || notice.link_url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(notice)}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          notice.is_active
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={notice.is_active ? 'Deactivate Notice' : 'Activate Notice'}
                      >
                        {notice.is_active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(notice)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-500/10 dark:hover:text-sky-400 transition-colors cursor-pointer"
                        title="Edit Notice"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingNotice(notice)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-500/10 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* 2. Dedicated Create / Edit Notice Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={resetForm}
        title={editingNotice ? 'Edit Notice Bulletin' : 'Post New Notice Bulletin'}
        maxWidth="max-w-xl"
        hideCloseButton={true}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Notice Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Notice Title / Headline <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AWS Certification Workshop Registration is Live!"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Notice Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Notice Type / Priority
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['announcement', 'event', 'urgent', 'info'] as NoticeType[]).map((t) => {
                const cfg = NOTICE_TYPE_CONFIG[t];
                const Icon = cfg.icon;
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? `${cfg.bg} ${cfg.text} ${cfg.activeBorder} ${cfg.activeRing} font-black shadow-sm`
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Content / Details */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Detailed Message (Optional)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add optional additional details or instructions for members..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Optional Link URL & Link Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Action Link URL (Optional)
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="e.g. /events/aws-certification or https://..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Link Button Text (Optional)
              </label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. Register Now or Learn More"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Publish immediately (Active in Navbar)
              </span>
            </label>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={resetForm} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting
                ? 'Saving...'
                : editingNotice
                ? 'Update Notice'
                : 'Publish Notice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Themed Delete Confirmation Modal (Identical to Delete Event Modal) */}
      <ConfirmModal
        isOpen={!!deletingNotice}
        onClose={() => !isDeleting && setDeletingNotice(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Notice?"
        message={
          deletingNotice
            ? `Are you sure you want to delete notice "${deletingNotice.title}"? This notice will be permanently removed from the system.`
            : 'Are you sure you want to delete this notice?'
        }
        confirmText="Delete Notice"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Floating Status Toast */}
      <Toast
        isVisible={!!toastMsg}
        message={toastMsg?.text || ''}
        type={toastMsg?.type || 'success'}
        onClose={() => setToastMsg(null)}
        duration={3000}
      />
    </>
  );
};
