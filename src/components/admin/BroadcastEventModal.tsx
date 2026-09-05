import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  AlertCircle, 
  Users, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Search, 
  Mail, 
  ChevronDown, 
  Sliders, 
  Check, 
  X 
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Event } from '../../types';
import type { Member } from '../../types/database';
import { getMembers } from '../../services/members';
import { sendEventBroadcastEmail } from '../../services/email';
import { formatEventDate, formatEventTime } from '../../utils/formatters';

export type BroadcastAudienceType = 'all' | 'core' | 'members' | 'custom';

interface BroadcastEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onBroadcastSuccess?: () => void;
}

export const BroadcastEventModal: React.FC<BroadcastEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onBroadcastSuccess,
}) => {
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [audienceType, setAudienceType] = useState<BroadcastAudienceType>('all');
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set());
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    if (isOpen && event) {
      setSuccessResult(null);
      setError(null);
      setAudienceType('all');
      setLoadingMembers(true);
      getMembers()
        .then((members) => {
          setAllMembers(members);
          // Initialize custom selection with all members by default
          setCustomSelectedIds(new Set(members.map((m) => m.id)));
        })
        .catch((err) => {
          console.error('Failed to load members for broadcast:', err);
          setError('Could not fetch active member directory.');
        })
        .finally(() => {
          setLoadingMembers(false);
        });
    }
  }, [isOpen, event]);

  // Compute active recipient list according to selected audience
  const activeRecipients = useMemo(() => {
    let filteredList: Member[] = [];
    if (audienceType === 'core') {
      filteredList = allMembers.filter((m) => m.is_core_member);
    } else if (audienceType === 'members') {
      filteredList = allMembers.filter((m) => !m.is_core_member);
    } else if (audienceType === 'custom') {
      filteredList = allMembers.filter((m) => customSelectedIds.has(m.id));
    } else {
      // 'all'
      filteredList = allMembers;
    }

    const emailMap = new Map<string, string>();
    filteredList.forEach((m) => {
      if (m.email && m.email.includes('@')) {
        const cleanEmail = m.email.trim().toLowerCase();
        if (!emailMap.has(cleanEmail)) {
          emailMap.set(cleanEmail, m.name || '');
        }
      }
    });

    return Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));
  }, [audienceType, allMembers, customSelectedIds]);

  if (!event) return null;

  const handleAudienceChange = (newAudience: BroadcastAudienceType) => {
    setAudienceType(newAudience);
    if (newAudience === 'custom') {
      setIsCustomPickerOpen(true);
    }
  };

  const handleToggleMember = (memberId: string) => {
    setCustomSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleSelectAllCustom = () => {
    setCustomSelectedIds(new Set(allMembers.map((m) => m.id)));
  };

  const handleDeselectAllCustom = () => {
    setCustomSelectedIds(new Set());
  };

  const handleSelectCoreOnlyCustom = () => {
    setCustomSelectedIds(new Set(allMembers.filter((m) => m.is_core_member).map((m) => m.id)));
  };

  const handleSelectMembersOnlyCustom = () => {
    setCustomSelectedIds(new Set(allMembers.filter((m) => !m.is_core_member).map((m) => m.id)));
  };

  const filteredMembersForCustom = useMemo(() => {
    const q = customSearchQuery.trim().toLowerCase();
    if (!q) return allMembers;
    return allMembers.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.uid && m.uid.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q))
    );
  }, [allMembers, customSearchQuery]);

  const handleBroadcast = async () => {
    if (activeRecipients.length === 0) {
      setError('No valid email recipients selected.');
      return;
    }

    setIsBroadcasting(true);
    setError(null);

    try {
      const result = await sendEventBroadcastEmail(
        {
          title: event.title,
          date: event.date || '',
          start_time: event.start_time || undefined,
          location: event.location || 'Chandigarh University',
          description: event.description || undefined,
          image_url: event.image_url || undefined,
          slug: event.slug || undefined,
        },
        activeRecipients
      );

      setSuccessResult({
        sent: result.sentCount || activeRecipients.length,
        total: activeRecipients.length,
      });

      onBroadcastSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to broadcast event announcement.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const audienceDescriptions: Record<BroadcastAudienceType, string> = {
    all: 'All active registered club members in the directory',
    core: 'Exclusively active Core Team & Council members',
    members: 'Exclusively active General Club members',
    custom: `Custom selected list (${customSelectedIds.size} of ${allMembers.length} members)`,
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Broadcast Event Announcement"
        maxWidth="max-w-2xl"
        hideCloseButton={true}
      >
        <div className="space-y-6">
          {successResult ? (
            <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Event Broadcast Dispatched!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Successfully sent event notification to{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {successResult.sent} of {successResult.total}
                  </strong>{' '}
                  recipients.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Event Summary Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                      Event to Announce
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {event.title}
                    </h3>
                  </div>
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">
                      {formatEventDate(event.date)}
                      {event.start_time && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600 font-bold mx-1.5">•</span>
                          <span>{formatEventTime(event.start_time)}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{event.location || 'Chandigarh University'}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Audience Selector Card */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Target Recipient Audience
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {audienceDescriptions[audienceType]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {audienceType === 'custom' && (
                      <button
                        type="button"
                        onClick={() => setIsCustomPickerOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Edit Custom Selected Members"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Edit Selection</span>
                      </button>
                    )}
                    <div className="text-right shrink-0">
                      {loadingMembers ? (
                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-auto" />
                      ) : (
                        <span className="text-sm font-black text-blue-600 dark:text-sky-400 whitespace-nowrap">
                          {activeRecipients.length} recipients
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audience 4-Option Dropdown */}
                <div className="pt-2 border-t border-blue-500/15">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Select Audience Group
                  </label>
                  <div className="relative">
                    <select
                      value={audienceType}
                      onChange={(e) => handleAudienceChange(e.target.value as BroadcastAudienceType)}
                      disabled={loadingMembers}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm appearance-none pr-9"
                    >
                      <option value="all">
                        1. All Directory ({allMembers.length} active members)
                      </option>
                      <option value="core">
                        2. Core Team ({allMembers.filter((m) => m.is_core_member).length} council members)
                      </option>
                      <option value="members">
                        3. Members ({allMembers.filter((m) => !m.is_core_member).length} general members)
                      </option>
                      <option value="custom">
                        4. Custom Selection ({customSelectedIds.size} selected)
                      </option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Warning Note */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  This will dispatch an official event announcement email to all{' '}
                  <strong>{activeRecipients.length} recipients</strong> ({audienceType === 'all' ? 'All Directory' : audienceType === 'core' ? 'Core Team' : audienceType === 'members' ? 'General Members' : 'Custom Selection'}). Please verify all details before broadcasting.
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isBroadcasting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleBroadcast}
                  disabled={isBroadcasting || loadingMembers || activeRecipients.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isBroadcasting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Broadcasting ({activeRecipients.length})...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>Send Announcement ({activeRecipients.length})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Custom Member Selector Popup Modal */}
      {isCustomPickerOpen && (
        <Modal
          isOpen={isCustomPickerOpen}
          onClose={() => setIsCustomPickerOpen(false)}
          title="Select Custom Recipients"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Top Search & Filter Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  placeholder="Search by student name, UID, or email..."
                  className="w-full pl-10 pr-9 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {customSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomSearchQuery('')}
                    className="w-6 h-6 absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Action Pill Buttons */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Selected:{' '}
                  <span className="text-blue-600 dark:text-sky-400 font-black">
                    {customSelectedIds.size}
                  </span>{' '}
                  / {allMembers.length} members
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAllCustom}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllCustom}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectCoreOnlyCustom}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Only Core
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectMembersOnlyCustom}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-sky-400 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Only Members
                  </button>
                </div>
              </div>
            </div>

            {/* Member Registration-Style Boxes List */}
            <div className="max-h-[380px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredMembersForCustom.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-medium">
                  No members found matching "{customSearchQuery}"
                </div>
              ) : (
                filteredMembersForCustom.map((member) => {
                  const isSelected = customSelectedIds.has(member.id);

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleToggleMember(member.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400/80 dark:border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {member.name}
                            </span>
                            {member.uid && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                UID: {member.uid.toUpperCase()}
                              </span>
                            )}
                            {member.is_core_member ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                                👑 Core Team {member.role?.name ? `• ${member.role.name}` : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                                Member
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                            <span className="truncate">{member.email}</span>
                            {member.department && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600 font-bold">•</span>
                                <span className="truncate">{member.department}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Custom Picker Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">
                {customSelectedIds.size} recipient(s) selected
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCustomPickerOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

