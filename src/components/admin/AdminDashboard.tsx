import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  Check,
  X,
  Eye,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  FileText,
  UploadCloud,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { VerificationDocModal } from './VerificationDocModal';
import { ManageRoleModal } from './ManageRoleModal';
import {
  getPendingMemberApplications,
  approveMemberApplicationService,
  rejectMemberApplicationService,
  getMembers,
  deleteMemberAdmin,
} from '../../services/members';
import { getEvents, createEvent, uploadEventPdf, getEventPdfViewerUrl } from '../../services/events';
import { getRoles } from '../../services/roles';
import type { Member, Event, Role } from '../../types/database';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'events' | 'forms' | 'members'>('applications');

  // Pending Applications State
  const [pendingApplications, setPendingApplications] = useState<Member[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [selectedDocFile, setSelectedDocFile] = useState<{ path: string; name: string } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Active Members & Roles State
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Member | null>(null);

  // Events State
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventPdfFile, setEventPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    date: '',
    time: '10:00',
    location: '',
    registration_enabled: true,
  });

  const loadPendingApps = async () => {
    setLoadingApplications(true);
    try {
      const apps = await getPendingMemberApplications();
      setPendingApplications(apps);
    } catch (err) {
      console.error('Error fetching pending apps:', err);
    } finally {
      setLoadingApplications(false);
    }
  };

  const loadAllMembers = async () => {
    setLoadingMembers(true);
    try {
      const [list, roles] = await Promise.all([getMembers(), getRoles()]);
      setMembersList(list);
      setRolesList(roles);
    } catch (err) {
      console.error('Error fetching members or roles:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadAllEvents = async () => {
    setLoadingEvents(true);
    try {
      const evs = await getEvents();
      setEventsList(evs);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadPendingApps();
    loadAllMembers();
    loadAllEvents();
  }, []);

  const handleApprove = async (member: Member) => {
    try {
      await approveMemberApplicationService(member.id, member.verification_file_url);
      setActionSuccess(`Approved ${member.name} (${member.registration_id}). Verification document deleted.`);
      loadPendingApps();
      loadAllMembers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Approval failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleReject = async (member: Member) => {
    if (!confirm(`Are you sure you want to reject application for ${member.name}?`)) return;
    try {
      setPendingApplications((prev) => prev.filter((app) => app.id !== member.id));
      await rejectMemberApplicationService(member.id, member.verification_file_url);
      setActionSuccess(`Rejected application for ${member.name}. Member status set to inactive.`);
      await loadPendingApps();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Rejection failed: ${err?.message || 'Unknown error'}`);
      loadPendingApps();
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete member ${name}?`)) return;
    try {
      setMembersList((prev) => prev.filter((m) => m.id !== memberId));
      await deleteMemberAdmin(memberId);
      setActionSuccess(`Member ${name} marked as inactive and removed from admin list.`);
      await loadAllMembers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Failed to delete member: ${err?.message}`);
      loadAllMembers();
    }
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.title || !newEventData.date || !newEventData.time) return;

    setIsUploadingPdf(true);
    try {
      const eventId = crypto.randomUUID();
      const autoSlug =
        newEventData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `event-${Date.now()}`;

      let pdfUrl: string | null = null;
      if (eventPdfFile) {
        pdfUrl = await uploadEventPdf(eventPdfFile, eventId);
      }

      await createEvent({
        id: eventId,
        title: newEventData.title.trim(),
        slug: autoSlug,
        description: newEventData.description.trim() || null,
        date: newEventData.date,
        start_time: newEventData.time,
        location: newEventData.location.trim() || 'Chandigarh University',
        pdf_url: pdfUrl,
        registration_enabled: newEventData.registration_enabled,
        status: 'upcoming',
      });

      setActionSuccess(`Successfully created event "${newEventData.title}"!`);
      setIsCreateEventOpen(false);
      setEventPdfFile(null);
      setNewEventData({
        title: '',
        description: '',
        date: '',
        time: '10:00',
        location: '',
        registration_enabled: true,
      });
      await loadAllEvents();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Event creation failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const filteredMembers = membersList.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.uid || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.registration_id.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar — now rendered inside Navbar, see Navbar.tsx */}

        {/* Action Success Alert Banner */}
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}

        {/* Management Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Membership Applications</span>
            {pendingApplications.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                {pendingApplications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members & Core Directory</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {membersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Events Management</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {eventsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'forms'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Event Registration Form Builder</span>
          </button>
        </div>

        {/* Tab Content 1: Pending Membership Applications */}
        {activeTab === 'applications' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Pending Membership Applications</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review applicant details, verify their CUIMS screenshot, and approve or reject applications.
                </p>
              </div>
              <button
                onClick={loadPendingApps}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Refresh List
              </button>
            </div>

            {loadingApplications ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading pending applications...</div>
            ) : pendingApplications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-slate-500">There are no pending membership applications to review.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-4">UID / Reg ID</th>
                      <th className="py-3 px-4">Dept & Year</th>
                      <th className="py-3 px-4">CUIMS Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {pendingApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{app.name}</div>
                          <div className="text-[11px] text-slate-500">{app.email}</div>
                          {app.phone && <div className="text-[10px] text-slate-400">{app.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-blue-600 dark:text-sky-400 font-bold">{app.registration_id}</div>
                          <div className="text-slate-500 text-[11px]">{app.uid}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>{app.department || 'N/A'}</div>
                          <div className="text-slate-500 text-[11px]">{app.year || 'N/A'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {app.verification_file_url ? (
                            <button
                              onClick={() => setSelectedDocFile({ path: app.verification_file_url!, name: app.name })}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 hover:bg-blue-100 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Screenshot</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No File</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(app)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(app)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Members Directory & Core Team CRUD */}
        {activeTab === 'members' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold">Active Members & Core Team Directory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage active club members, assign executive core roles, or remove members.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name, UID, Reg ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-xs border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {loadingMembers ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading members directory...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Reg ID & UID</th>
                      <th className="py-3 px-4">Department & Year</th>
                      <th className="py-3 px-4">Role / Core Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {member.is_core_member && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-sky-400">
                                {member.role?.name || 'Core Member'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{member.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-blue-600 dark:text-sky-400 font-bold">{member.registration_id}</div>
                          <div className="text-slate-500 text-[11px]">{member.uid}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>{member.department || 'N/A'}</div>
                          <div className="text-slate-500 text-[11px]">{member.year || 'N/A'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setSelectedMemberForRole(member)}
                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1 shadow-sm ${
                              member.is_core_member
                                ? 'bg-amber-100/90 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                            title="Click to manage core responsibility or convert to normal user"
                          >
                            {member.is_core_member ? '★ Core Member' : 'Make Core Member'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteMember(member.id, member.name)}
                            className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Events Management */}
        {activeTab === 'events' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Club Events Management</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create new club events, upload event PDF schedules, or manage event registration windows.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateEventOpen(true)}
              >
                Create New Event
              </Button>
            </div>

            {loadingEvents ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading events...</div>
            ) : eventsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No events found. Click "Create New Event" to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventsList.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{evt.title}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          evt.registration_enabled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {evt.registration_enabled ? 'Registration Open' : 'Closed'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {evt.description || 'Cloud Stack Club Official Event. Registration is currently open.'}
                    </p>

                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                          <span>📅 {evt.date ? new Date(evt.date).toLocaleDateString() : 'TBD'}</span>
                          {evt.start_time && (
                            <span className="flex items-center gap-0.5 text-blue-600 dark:text-sky-400">
                              <Clock className="w-3 h-3" />
                              <span>{evt.start_time}</span>
                            </span>
                          )}
                        </div>
                        <div>📍 {evt.location || 'Chandigarh University'}</div>
                      </div>

                      {evt.pdf_url && (
                        <a
                          href={getEventPdfViewerUrl(evt.pdf_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Event PDF</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 4: Registration Form Builder */}
        {activeTab === 'forms' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold">Event Registration Form Builder</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize dynamic form questions for event registration forms. Select an event to configure.
              </p>
            </div>

            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-sky-400 mx-auto opacity-80" />
              <h3 className="text-sm font-bold">Dynamic Form Fields Active</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Standard event registration forms collect Full Name, Student Email, Phone, UID, Department, and Year automatically. Custom form field overrides can be linked per event.
              </p>
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        <Modal isOpen={isCreateEventOpen} onClose={() => setIsCreateEventOpen(false)} title="Create New Event">
          <form onSubmit={handleCreateEventSubmit} className="space-y-4">
            {/* EVENT TITLE * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={newEventData.title}
                onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                placeholder="e.g. Cloud Native Hackathon 2026"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
              />
            </div>

            {/* EVENT PDF Dropzone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Event PDF
              </label>

              {eventPdfFile ? (
                <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {eventPdfFile.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(eventPdfFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={URL.createObjectURL(eventPdfFile)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 hover:bg-blue-500/25 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setEventPdfFile(null)}
                      className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Remove PDF"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                          alert('Only PDF files are accepted.');
                          return;
                        }
                        if (file.size > 15 * 1024 * 1024) {
                          alert('PDF file size must be under 15 MB.');
                          return;
                        }
                        setEventPdfFile(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-blue-500 dark:group-hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-center transition-all space-y-1">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload Event PDF</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">PDF files only (guidelines, schedule, rules)</p>
                  </div>
                </div>
              )}
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={newEventData.description}
                onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                placeholder="Event details, schedule, and guidelines..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
              />
            </div>

            {/* EVENT DATE * | EVENT TIME * */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={newEventData.date}
                  onChange={(e) => setNewEventData({ ...newEventData, date: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Time *
                </label>
                <input
                  type="time"
                  required
                  value={newEventData.time}
                  onChange={(e) => setNewEventData({ ...newEventData, time: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* LOCATION */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={newEventData.location}
                onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                placeholder="e.g. CU Main Auditorium"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button type="submit" variant="primary" size="md" disabled={isUploadingPdf} className="w-full">
                {isUploadingPdf ? 'Publishing Event...' : 'Publish Event'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* CUIMS Verification Document Viewer Modal */}
        <VerificationDocModal
          isOpen={!!selectedDocFile}
          onClose={() => setSelectedDocFile(null)}
          filePath={selectedDocFile?.path || null}
          applicantName={selectedDocFile?.name || 'Applicant'}
        />

        {/* Role & Core Status Management Modal */}
        <ManageRoleModal
          isOpen={!!selectedMemberForRole}
          onClose={() => setSelectedMemberForRole(null)}
          member={selectedMemberForRole}
          roles={rolesList}
          onSuccess={() => loadAllMembers()}
        />
      </div>
    </div>
  );
};
