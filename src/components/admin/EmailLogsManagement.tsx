import React, { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  MessageSquare,
  Sparkles,
  Radio,
  Sliders,
  Palette,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { EmailTemplatesModal } from './EmailTemplatesModal';
import { EmailDesignStudioModal } from './EmailDesignStudioModal';
import type { EmailLog, EmailCategory } from '../../types/email';
import { fetchEmailLogs, deleteEmailLog, fetchEmailStats, type EmailStats } from '../../services/email';
import { supabase } from '../../services/supabase';

const CATEGORIES: Array<{ id: EmailCategory | 'all'; label: string; icon: any; color: string }> = [
  { id: 'all', label: 'All Emails', icon: Mail, color: 'text-slate-600 dark:text-slate-300' },
  { id: 'approval', label: 'Approvals', icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'rejection', label: 'Rejections', icon: UserX, color: 'text-rose-600 dark:text-rose-400' },
  { id: 'contact_us', label: 'Contact Us', icon: MessageSquare, color: 'text-blue-600 dark:text-sky-400' },
  { id: 'event_feedback', label: 'Event Feedback', icon: Sparkles, color: 'text-amber-600 dark:text-amber-400' },
  { id: 'event_broadcast', label: 'Event Broadcasts', icon: Radio, color: 'text-purple-600 dark:text-purple-400' },
];

export const getAdminDisplayName = (name?: string | null, email?: string | null): string => {
  let displayName = name?.trim();
  const rawEmail = (email || '').trim().toLowerCase();

  if (
    rawEmail.includes('laksh') ||
    rawEmail.includes('gosai') ||
    (displayName && (displayName.toLowerCase().includes('laksh') || displayName.toLowerCase().includes('gosai')))
  ) {
    return 'Lakshya Gosai';
  }
  if (rawEmail.includes('sushant') || (displayName && displayName.toLowerCase().includes('sushant'))) {
    return 'Sushant Kumar';
  }
  if (rawEmail.includes('utkrisht') || (displayName && displayName.toLowerCase().includes('utkrisht'))) {
    return 'Utkrisht Utpal';
  }
  if (rawEmail.includes('bani') || (displayName && displayName.toLowerCase().includes('bani'))) {
    return 'Bani Kaur';
  }

  const isPrefixOnly =
    !displayName ||
    displayName === email ||
    displayName.includes('@') ||
    (rawEmail && rawEmail.startsWith(displayName.toLowerCase())) ||
    /^[a-z0-9._-]+$/i.test(displayName);

  if (isPrefixOnly) {
    if (displayName) {
      const clean = displayName
        .replace(/[0-9]/g, ' ')
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      displayName = clean.replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (rawEmail) {
      const clean = rawEmail.split('@')[0]
        .replace(/[0-9]/g, ' ')
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      displayName = clean.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  return displayName || 'Administrator';
};

export const getAdminRole = (
  name?: string | null,
  email?: string | null,
  customRoleMap?: Record<string, string>
): string => {
  const rawEmail = (email || '').trim().toLowerCase();
  const rawName = (name || '').trim().toLowerCase();

  // 1. Check custom role map from database if present
  if (customRoleMap && rawEmail && customRoleMap[rawEmail]) {
    return customRoleMap[rawEmail];
  }

  // 2. Recognized leadership roles
  if (rawEmail.includes('laksh') || rawEmail.includes('gosai') || rawName.includes('laksh') || rawName.includes('gosai')) {
    return 'Secretary';
  }
  if (rawEmail.includes('utkrisht') || rawName.includes('utkrisht')) {
    return 'President / Lead';
  }
  if (rawEmail.includes('sushant') || rawName.includes('sushant')) {
    return 'Technical Lead';
  }
  if (rawEmail.includes('bani') || rawName.includes('bani')) {
    return 'Joint Secretary';
  }

  return 'Administrator';
};

export const formatAdminSender = (
  name?: string | null,
  email?: string | null,
  customRoleMap?: Record<string, string>
): string => {
  const displayName = getAdminDisplayName(name, email);
  const role = getAdminRole(name, email, customRoleMap);
  return `${displayName} (${role})`;
};

export const EmailLogsManagement: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<EmailCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [isDesignStudioOpen, setIsDesignStudioOpen] = useState<boolean>(false);
  const [memberRoleMap, setMemberRoleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMemberRoles = async () => {
      try {
        const { data } = await supabase
          .from('members')
          .select('email, role:roles(name)');
        if (data && Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((m: any) => {
            if (m.email && m.role?.name) {
              map[m.email.toLowerCase().trim()] = m.role.name;
            }
          });
          setMemberRoleMap(map);
        }
      } catch (err) {
        console.warn('Could not load member roles map:', err);
      }
    };
    fetchMemberRoles();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchEmailLogs(activeCategory, searchQuery);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    approvals: 0,
    rejections: 0,
    inquiries: 0,
    broadcasts: 0,
    feedbacks: 0,
  });

  const loadStats = async () => {
    try {
      const data = await fetchEmailStats();
      setStats(data);
    } catch (err) {
      console.warn('Failed to load universal stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([loadLogs(), loadStats()]);
  };

  const handleConfirmDelete = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      await deleteEmailLog(logToDelete);
      setLogs((prev) => prev.filter((item) => item.id !== logToDelete));
      if (selectedLog?.id === logToDelete) {
        setSelectedLog(null);
      }
      setLogToDelete(null);
      loadStats();
    } catch (err) {
      console.error('Failed to delete log:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryBadge = (category: EmailCategory) => {
    switch (category) {
      case 'approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <UserCheck className="w-3 h-3" />
            Approval
          </span>
        );
      case 'rejection':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <UserX className="w-3 h-3" />
            Rejection
          </span>
        );
      case 'contact_us':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
            <MessageSquare className="w-3 h-3" />
            Contact Us
          </span>
        );
      case 'event_feedback':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3 h-3" />
            Feedback
          </span>
        );
      case 'event_broadcast':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Radio className="w-3 h-3" />
            Broadcast
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              E - Mails Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review history and delivery logs of automated emails dispatched from your official cloudstackclub@cumail.in account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsDesignStudioOpen(true)}
            className="px-4 py-2 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 hover:border-indigo-400 dark:hover:border-indigo-700 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap group"
            title="Choose header design layouts and color gradients for emails"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Design Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:border-blue-500/40 dark:hover:border-sky-500/40 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap group"
            title="Configure and preview automated email templates"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span>Email Templates</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:border-blue-500/40 dark:hover:border-sky-500/40 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Refresh Delivery Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-sky-400 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-[1.02] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Logged</p>
            <div className="w-5 h-5 rounded-md bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Mail className="w-3 h-3" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 transition-all hover:scale-[1.02] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approvals</p>
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-3 h-3" />
            </div>
          </div>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.approvals}</p>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-all hover:scale-[1.02] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Rejections</p>
            <div className="w-5 h-5 rounded-md bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <UserX className="w-3 h-3" />
            </div>
          </div>
          <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.rejections}</p>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-all hover:scale-[1.02] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400">Contact Us</p>
            <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-sky-400">
              <MessageSquare className="w-3 h-3" />
            </div>
          </div>
          <p className="text-lg font-black text-blue-600 dark:text-sky-400 mt-0.5">{stats.inquiries}</p>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 transition-all hover:scale-[1.02] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Feedbacks</p>
            <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.feedbacks}</p>
        </div>

        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 transition-all hover:scale-[1.02] shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Broadcasts</p>
            <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Radio className="w-3 h-3" />
            </div>
          </div>
          <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.broadcasts}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, name, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-slate-300 dark:focus:border-slate-600 focus:outline-none focus:ring-0 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all"
          />
        </form>
      </div>

      {/* Email History Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className={`overflow-x-auto ${logs.length > 5 ? 'max-h-[350px] overflow-y-auto custom-scrollbar' : ''}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dispatched At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold">Loading email logs...</p>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Mail className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold">No email logs found matching this filter.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div
                      className="font-extrabold text-slate-900 dark:text-white truncate max-w-[200px] lg:max-w-[240px]"
                      title={log.recipient_name || 'Member / User'}
                    >
                      {log.recipient_name || 'Member / User'}
                    </div>
                    <div
                      className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px] lg:max-w-[240px]"
                      title={log.recipient_email}
                    >
                      {log.recipient_email}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getCategoryBadge(log.category)}
                  </td>
                  <td className="py-3 px-4">
                    <div
                      className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[300px] lg:max-w-[420px]"
                      title={log.subject}
                    >
                      {log.subject}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-200/60 dark:border-blue-500/25 hover:bg-blue-100 dark:hover:bg-blue-500/25 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogToDelete(log.id)}
                        disabled={isDeleting}
                        className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/25 hover:bg-rose-100 dark:hover:bg-rose-500/25 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Email Dispatch Details"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            {/* Category & Status */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>{getCategoryBadge(selectedLog.category)}</div>
              <div>
                {selectedLog.status === 'sent' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Delivered Successfully
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    Failed to Send
                  </span>
                )}
              </div>
            </div>

            {/* Recipient info */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Recipient:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{selectedLog.recipient_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Address:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.recipient_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Subject:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[280px] truncate">{selectedLog.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Date &amp; Time:</span>
                <span className="text-slate-600 dark:text-slate-400">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Dispatched By:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatAdminSender(selectedLog.sent_by_name, selectedLog.sent_by_email, memberRoleMap)}
                </span>
              </div>
            </div>

            {/* Rejection reason or custom metadata */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metadata / Notes:</span>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  {selectedLog.metadata.rejection_reason && (
                    <div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">Rejection Feedback: </span>
                      <span className="italic text-slate-700 dark:text-slate-300">"{selectedLog.metadata.rejection_reason}"</span>
                    </div>
                  )}
                  {selectedLog.metadata.reply && (
                    <div>
                      <span className="font-bold text-blue-600 dark:text-sky-400">Admin Reply: </span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedLog.metadata.reply}</span>
                    </div>
                  )}
                  {selectedLog.metadata.event_title && (
                    <div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">Event Title: </span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedLog.metadata.event_title}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message if failed */}
            {selectedLog.error_message && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                <span className="font-bold block mb-0.5">Error Details:</span>
                <span className="font-mono text-[11px]">{selectedLog.error_message}</span>
              </div>
            )}

          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!logToDelete}
        onClose={() => setLogToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Email Log"
        message="Are you sure you want to delete this dispatch log entry? This action is permanent and cannot be undone."
        confirmText="Delete Log"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Visual Email Templates Editor & Live Preview Modal */}
      <EmailTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
      />

      {/* Email Header Design Studio Modal */}
      <EmailDesignStudioModal
        isOpen={isDesignStudioOpen}
        onClose={() => setIsDesignStudioOpen(false)}
      />
    </div>
  );
};
