import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Pencil,
  Search,
  CheckCircle2,
  FileText,
  UploadCloud,
  Clock,
  Users2,
  Ticket,
  Image as ImageIcon,
  Maximize2,
  Sparkles,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { VerificationDocModal } from './VerificationDocModal';
import { ManageRoleModal } from './ManageRoleModal';
import { EventPdfModal } from './EventPdfModal';
import { EventPosterModal } from './EventPosterModal';
import { DownloadDropdown } from './DownloadDropdown';
import { EventFormBuilder } from './EventFormBuilder';
import { ViewRegistrationsModal } from './ViewRegistrationsModal';
import { getEventRegistrationCountsMap } from '../../services/registrationForms';
import { CustomSelect } from '../ui/CustomSelect';
import { ConfirmModal } from '../ui/ConfirmModal';
import { formatEventTime, getEventStatusInfo, isRegistrationActive } from '../../utils/formatters';
import {
  getPendingMemberApplications,
  approveMemberApplicationService,
  rejectMemberApplicationService,
  getMembers,
  deleteMemberAdmin,
} from '../../services/members';
import {
  getEvents,
  createEvent,
  updateEventAdmin,
  deleteEventAdmin,
  deleteEventPosterAdmin,
  deleteEventPdfAdmin,
  uploadEventPdf,
  uploadEventImage,
  sortEventsByRelevance,
} from '../../services/events';
import { getRoles } from '../../services/roles';
import { getAllFeedbacks, updateFeedbackStatus } from '../../services/feedback';
import { exportFeedbacksToPdf } from '../../utils/exportDirectory';
import type { Member, Event, Role, ContactFeedback } from '../../types/database';

const EVENT_CATEGORY_OPTIONS = [
  { value: 'Hackathons', label: 'Hackathons' },
  { value: 'Ideathons', label: 'Ideathons' },
  { value: 'Expert Talks', label: 'Expert Talks' },
  { value: 'Industry Visits', label: 'Industry Visits' },
  { value: 'Workshops', label: 'Workshops' },
  { value: 'Bootcamps', label: 'Bootcamps' },
];



const getInitialFeedbacksCache = (): ContactFeedback[] => {
  try {
    const cached = localStorage.getItem('csc_contact_feedbacks');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'events' | 'forms' | 'members' | 'feedbacks'>('applications');

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
  const [memberFilter, setMemberFilter] = useState<'all' | 'members' | 'core'>('all');
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Member | null>(null);

  // Events State (Direct Real DB Fetching)
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventPdfFile, setEventPdfFile] = useState<File | null>(null);
  const [eventPosterFile, setEventPosterFile] = useState<File | null>(null);
  const [selectedEventPdf, setSelectedEventPdf] = useState<{ url: string; title: string } | null>(null);
  const [selectedEventPoster, setSelectedEventPoster] = useState<{ url: string; title: string } | null>(null);
  const [viewRegsEvent, setViewRegsEvent] = useState<Event | null>(null);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Create Event Form State (starts with registration disabled by default)
  const [newEventData, setNewEventData] = useState({
    title: '',
    category: '',
    description: '',
    date: '',
    time: '10:00',
    location: '',
    registration_enabled: false,
    registration_start: '',
    registration_end: '',
    supports_teams: false,
    max_team_size: 1,
    max_registrations: '',
  });

  // Edit Event Form State
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editEventData, setEditEventData] = useState({
    title: '',
    category: '',
    description: '',
    date: '',
    time: '',
    location: '',
    registration_enabled: true,
    registration_start: '',
    registration_end: '',
    supports_teams: false,
    max_team_size: 1,
    max_registrations: '',
  });
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);

  // Contact & Feedbacks State (Instant Cache Initialization)
  const [feedbacksList, setFeedbacksList] = useState<ContactFeedback[]>(getInitialFeedbacksCache);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(() => getInitialFeedbacksCache().length === 0);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'archived'>('all');

  const loadPendingApps = async () => {
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
    try {
      const [evs, counts] = await Promise.all([
        getEvents(),
        getEventRegistrationCountsMap(),
      ]);
      if (evs) setEventsList(evs);
      if (counts) setRegistrationCounts(counts);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const hasEventRegistrations = (evt: Event): boolean => {
    const evtIdKey = (evt.id || '').toLowerCase();
    const evtSlugKey = (evt.slug || '').toLowerCase();
    const count = (registrationCounts[evtIdKey] || 0) + (registrationCounts[evtSlugKey] || 0);
    return count > 0;
  };

  const loadAllFeedbacks = async () => {
    try {
      const fbs = await getAllFeedbacks();
      if (fbs) setFeedbacksList(fbs);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleUpdateFeedbackStatus = async (id: string, newStatus: any) => {
    setFeedbacksList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
    );
    const success = await updateFeedbackStatus(id, newStatus);
    if (success) {
      setActionSuccess(`Feedback status updated to "${newStatus.toUpperCase()}"`);
      setTimeout(() => setActionSuccess(null), 2000);
    }
  };

  const handleExportFeedbacksPdf = () => {
    const filtered = feedbacksList.filter((f) => {
      const matchSearch =
        !feedbackSearch ||
        f.name.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
        f.email.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
        f.message.toLowerCase().includes(feedbackSearch.toLowerCase());

      const matchStatus =
        feedbackFilter === 'all' ||
        (feedbackFilter === 'pending' && (f.status === 'pending' || f.status === 'unread')) ||
        (feedbackFilter === 'in_progress' && f.status === 'in_progress') ||
        (feedbackFilter === 'resolved' && (f.status === 'resolved' || f.status === 'responded')) ||
        (feedbackFilter === 'archived' && f.status === 'archived');

      return matchSearch && matchStatus;
    });

    exportFeedbacksToPdf(filtered, feedbackFilter, feedbackSearch);
    setActionSuccess('Feedbacks PDF downloaded successfully!');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  const handleDeleteEventPoster = async (eventId: string) => {
    setEditingEvent((prev) => (prev ? { ...prev, image_url: null } : null));
    setEditPosterFile(null);
    setEventsList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, image_url: null } : e))
    );

    await deleteEventPosterAdmin(eventId);
    setActionSuccess('Event poster deleted from database!');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  const handleDeleteEventPdf = async (eventId: string) => {
    setEditingEvent((prev) => (prev ? { ...prev, pdf_url: null } : null));
    setEditPdfFile(null);
    setEventsList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, pdf_url: null } : e))
    );

    await deleteEventPdfAdmin(eventId);
    setActionSuccess('Event PDF schedule deleted from database!');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Concurrent parallel fetch (Stale-While-Revalidate pattern) for instant UI response
    Promise.all([
      loadPendingApps(),
      loadAllMembers(),
      loadAllEvents(),
      loadAllFeedbacks(),
    ]);
  }, []);

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {},
  });

  const handleApprove = async (member: Member) => {
    try {
      await approveMemberApplicationService(member.id, member.verification_file_url);
      setActionSuccess(`Approved ${member.name} (${member.registration_id}). Verification document deleted.`);
      loadPendingApps();
      loadAllMembers();
      setTimeout(() => setActionSuccess(null), 2000);
    } catch (err: any) {
      setActionSuccess(`Approval failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setActionSuccess(null), 2000);
    }
  };

  const handleReject = (member: Member) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Reject Application?',
      message: `Are you sure you want to reject application for ${member.name}? The status will be set to inactive.`,
      confirmText: 'Reject Application',
      variant: 'danger',
      onConfirm: async () => {
        setPendingApplications((prev) => prev.filter((app) => app.id !== member.id));
        setActionSuccess(`Rejected application for ${member.name}. Member status set to inactive.`);
        setTimeout(() => setActionSuccess(null), 2000);

        try {
          await rejectMemberApplicationService(member.id, member.verification_file_url);
        } catch (err: any) {
          console.warn('Rejection error:', err);
        }
      },
    });
  };

  const handleDeleteMember = (memberId: string, name: string) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Member?',
      message: `Are you sure you want to delete member ${name}? This member will be marked as inactive and removed from active directory.`,
      confirmText: 'Delete Member',
      variant: 'danger',
      onConfirm: async () => {
        setMembersList((prev) => prev.filter((m) => m.id !== memberId));
        setActionSuccess(`Member ${name} marked as inactive and removed from admin list.`);
        setTimeout(() => setActionSuccess(null), 2000);

        try {
          await deleteMemberAdmin(memberId);
        } catch (err: any) {
          console.warn('Member deletion error:', err);
        }
      },
    });
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.title || !newEventData.date || !newEventData.time) return;

    if (newEventData.registration_end && newEventData.date) {
      const eventDateObj = new Date(newEventData.date);
      const regEndObj = new Date(newEventData.registration_end);
      eventDateObj.setHours(0, 0, 0, 0);
      regEndObj.setHours(0, 0, 0, 0);

      if (regEndObj > eventDateObj) {
        const confirmSave = window.confirm(
          `⚠️ WARNING: Registration Deadline (${newEventData.registration_end}) is set AFTER the Event Date (${newEventData.date})!\n\nAre you sure you want to save this event with a deadline after the event date?`
        );
        if (!confirmSave) return;
      }
    }

    setIsUploadingMedia(true);
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

      let imageUrl: string | null = null;
      if (eventPosterFile) {
        imageUrl = await uploadEventImage(eventPosterFile, eventId);
      }

      const newEventObj: Event = {
        id: eventId,
        title: newEventData.title.trim(),
        category: newEventData.category || null,
        slug: autoSlug,
        description: newEventData.description.trim() || null,
        date: newEventData.date,
        start_time: newEventData.time,
        end_time: null,
        location: newEventData.location.trim() || 'Chandigarh University',
        pdf_url: pdfUrl,
        image_url: imageUrl,
        registration_enabled: newEventData.registration_enabled,
        registration_start: newEventData.registration_enabled ? (newEventData.registration_start || null) : null,
        registration_end: newEventData.registration_enabled ? (newEventData.registration_end || null) : null,
        supports_teams: newEventData.supports_teams,
        max_team_size: newEventData.supports_teams ? newEventData.max_team_size : 1,
        max_registrations: newEventData.max_registrations ? parseInt(newEventData.max_registrations) : null,
        status: 'upcoming',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic UI Update: Update React state & close modal INSTANTLY
      setEventsList((prev) => [newEventObj, ...prev.filter((e) => e.id !== eventId)]);
      setActionSuccess(`Successfully created event "${newEventData.title}"!`);
      setIsCreateEventOpen(false);
      setEventPdfFile(null);
      setEventPosterFile(null);
      setNewEventData({
        title: '',
        category: '',
        description: '',
        date: '',
        time: '10:00',
        location: '',
        registration_enabled: false,
        registration_start: '',
        registration_end: '',
        supports_teams: false,
        max_team_size: 1,
        max_registrations: '',
      });
      setTimeout(() => setActionSuccess(null), 2000);

      // Async DB Persistence & instant refresh
      await createEvent(newEventObj);
      await loadAllEvents();
    } catch (err: any) {
      alert(`Event creation failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleOpenEditEvent = (evt: Event) => {
    setEditingEvent(evt);
    setEditPdfFile(null);
    setEditPosterFile(null);
    setEditEventData({
      title: evt.title,
      category: evt.category || '',
      description: evt.description || '',
      date: evt.date ? evt.date.split('T')[0] : '',
      time: evt.start_time || '10:00',
      location: evt.location || '',
      registration_enabled: evt.registration_enabled ?? true,
      registration_start: evt.registration_start ? evt.registration_start.split('T')[0] : '',
      registration_end: evt.registration_end ? evt.registration_end.split('T')[0] : '',
      supports_teams: evt.supports_teams ?? false,
      max_team_size: evt.max_team_size || 1,
      max_registrations: evt.max_registrations ? evt.max_registrations.toString() : '',
    });
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editEventData.title) return;

    if (editEventData.registration_end && editEventData.date) {
      const eventDateObj = new Date(editEventData.date);
      const regEndObj = new Date(editEventData.registration_end);
      eventDateObj.setHours(0, 0, 0, 0);
      regEndObj.setHours(0, 0, 0, 0);

      if (regEndObj > eventDateObj) {
        const confirmSave = window.confirm(
          `⚠️ WARNING: Registration Deadline (${editEventData.registration_end}) is set AFTER the Event Date (${editEventData.date})!\n\nAre you sure you want to save this event with a deadline after the event date?`
        );
        if (!confirmSave) return;
      }
    }

    setIsUploadingMedia(true);
    try {
      let pdfUrl = editingEvent.pdf_url;
      if (editPdfFile) {
        pdfUrl = await uploadEventPdf(editPdfFile, editingEvent.id);
      }

      let imageUrl = editingEvent.image_url;
      if (editPosterFile) {
        imageUrl = await uploadEventImage(editPosterFile, editingEvent.id);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const newDateStr = editEventData.date ? editEventData.date.split('T')[0] : '';
      let computedStatus: Event['status'] = editingEvent.status;
      if (editingEvent.status !== 'cancelled') {
        if (newDateStr) {
          if (newDateStr === todayStr) {
            computedStatus = 'live';
          } else if (newDateStr > todayStr) {
            computedStatus = 'upcoming';
          } else {
            computedStatus = 'completed';
          }
        }
      }

      const updatedPayload: Partial<Event> = {
        title: editEventData.title.trim(),
        category: editEventData.category || null,
        description: editEventData.description.trim() || null,
        date: editEventData.date,
        start_time: editEventData.time,
        location: editEventData.location.trim(),
        pdf_url: pdfUrl,
        image_url: imageUrl,
        status: computedStatus,
        registration_enabled: editEventData.registration_enabled,
        registration_start: editEventData.registration_enabled ? (editEventData.registration_start || null) : null,
        registration_end: editEventData.registration_enabled ? (editEventData.registration_end || null) : null,
        supports_teams: editEventData.supports_teams,
        max_team_size: editEventData.supports_teams ? editEventData.max_team_size : 1,
        max_registrations: editEventData.max_registrations ? parseInt(editEventData.max_registrations) : null,
        updated_at: new Date().toISOString(),
      };

      // Optimistic UI Update: Update React state & close modal INSTANTLY
      setEventsList((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, ...updatedPayload } : e))
      );
      setActionSuccess(`Successfully updated event "${editEventData.title}"!`);
      setEditingEvent(null);
      setEditPdfFile(null);
      setEditPosterFile(null);
      setTimeout(() => setActionSuccess(null), 2000);

      // Async DB Persistence & instant refresh
      await updateEventAdmin(editingEvent.id, updatedPayload);
      await loadAllEvents();
    } catch (err: any) {
      alert(`Event update failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteEvent = (eventPayload: Event) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Event?',
      message: `Are you sure you want to delete event "${eventPayload.title}"? This event will be cancelled and its media files will be deleted from storage to free up space.`,
      confirmText: 'Delete Event',
      variant: 'danger',
      onConfirm: async () => {
        setEventsList((prev) => prev.filter((e) => e.id !== eventPayload.id));
        setActionSuccess(`Deleted event "${eventPayload.title}"`);
        setTimeout(() => setActionSuccess(null), 2000);

        try {
          await deleteEventAdmin(eventPayload.id, eventPayload.pdf_url, eventPayload.image_url);
        } catch (err: any) {
          console.warn('Background event deletion notice:', err);
        }
      },
    });
  };

  const filteredMembers = membersList.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.uid || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.registration_id.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (memberFilter === 'members') return !m.is_core_member;
    if (memberFilter === 'core') return m.is_core_member;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Management Navigation & Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none min-w-0">
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'forms'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Registration Form Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('feedbacks')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'feedbacks'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact & Feedbacks</span>
              {feedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                  {feedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length}
                </span>
              )}
            </button>
          </div>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Active Members & Core Team Directory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage active club members, assign executive core roles, or remove members.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                {/* Download Button Dropdown (Positioned to the Left of Filter Dropdown) */}
                <DownloadDropdown
                  members={filteredMembers}
                  currentFilter={memberFilter}
                  searchQuery={memberSearch}
                />

                {/* Filter Dropdown */}
                <div className="w-full sm:w-48 shrink-0">
                  <CustomSelect
                    value={memberFilter}
                    onChange={(val) => setMemberFilter(val as 'all' | 'members' | 'core')}
                    options={[
                      { value: 'all', label: `All (${membersList.length})` },
                      { value: 'members', label: `Members (${membersList.filter((m) => !m.is_core_member).length})` },
                      { value: 'core', label: `Core Members (${membersList.filter((m) => m.is_core_member).length})` },
                    ]}
                    triggerClassName="w-full h-10 px-3.5 rounded-2xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer flex items-center justify-between transition-all shadow-sm"
                  />
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name, UID, Reg ID..."
                    className="w-full pl-9 pr-3 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-xs border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                  />
                </div>
              </div>
            </div>

            {loadingMembers ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading members directory...</div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[550px] rounded-lg border border-slate-100 dark:border-slate-800/60 custom-scrollbar pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-semibold">Member Name</th>
                      <th className="py-3 px-4 font-semibold">Reg ID & UID</th>
                      <th className="py-3 px-4 font-semibold">Department & Year</th>
                      <th className="py-3 px-4 font-semibold">Role / Core Status</th>
                      <th className="py-3 px-4 text-right font-semibold">Actions</th>
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
                            className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold">Club Events Management</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create, edit, or delete club events, upload event poster & PDF schedules, and manage registration windows.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Event Filters Pill Group: All, Upcoming, Completed */}
                <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center gap-1">
                  {(['all', 'upcoming', 'completed'] as const).map((filter) => {
                    const isActive = eventFilter === filter;
                    const labels: Record<string, string> = {
                      all: 'All',
                      upcoming: 'Upcoming',
                      completed: 'Completed',
                    };
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setEventFilter(filter)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {labels[filter]}
                      </button>
                    );
                  })}
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
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4 animate-pulse"
                  >
                    <div className="w-full aspect-[4/5] rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
                    <div className="space-y-2">
                      <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
                      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
                    </div>
                    <div className="h-10 w-full bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (() => {
                const filtered = sortEventsByRelevance(eventsList).filter((evt) => {
                  if (eventFilter === 'all') return true;

                  // Direct database status classification
                  const isCompletedInDb = evt.status === 'completed';
                  const isUpcomingInDb = evt.status === 'upcoming' || evt.status === 'live';

                  if (eventFilter === 'upcoming') {
                    return isUpcomingInDb || (!isCompletedInDb && evt.status !== 'completed');
                  }

                  if (eventFilter === 'completed') {
                    return isCompletedInDb;
                  }

                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      No {eventFilter === 'all' ? '' : eventFilter} events found.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between space-y-4 group"
                  >
                    {/* Vertical Instagram Poster Frame with Ambient Blur Fill */}
                    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/80 dark:border-slate-700/60 shadow-md flex items-center justify-center">
                      {evt.image_url ? (
                        <>
                          {/* Ambient Blurred Background to prevent letterbox gaps */}
                          <div
                            className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110"
                            style={{ backgroundImage: `url(${evt.image_url})` }}
                          />
                          <img
                            src={evt.image_url}
                            alt={evt.title}
                            className="relative z-10 w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 drop-shadow-md rounded-xl"
                          />
                          <div
                            onClick={() => setSelectedEventPoster({ url: evt.image_url!, title: evt.title })}
                            className="absolute inset-0 z-20 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-black backdrop-blur-[2px] cursor-pointer"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>View Full Poster</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center p-6 text-center text-white font-bold">
                          <Sparkles className="w-12 h-12 opacity-50" />
                        </div>
                      )}

                      {/* Registration Status & Category/Ongoing Badge Overlay */}
                      <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 items-start">
                        {(() => {
                          const regActive = isRegistrationActive(evt);
                          const statusInfo = getEventStatusInfo(evt.date);
                          return (
                            <>
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${
                                  regActive
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-900/90 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {regActive ? 'Registration Open' : 'Registration Closed'}
                              </span>

                              <div className="flex items-center gap-1 flex-wrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg border ${
                                    statusInfo.type === 'ongoing'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black animate-pulse'
                                      : statusInfo.type === 'completed'
                                      ? 'bg-slate-900/80 text-slate-300 border-slate-700'
                                      : 'bg-slate-950/80 text-sky-300 border-sky-500/30'
                                  }`}
                                >
                                  {statusInfo.type === 'ongoing' ? '🔥 ONGOING EVENT' : statusInfo.label}
                                </span>

                                {evt.category && evt.category.trim() && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-950/80 text-slate-200 border border-white/20 backdrop-blur-md shadow-lg">
                                    {evt.category}
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Edit & Delete Action Buttons Overlay */}
                      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEvent(evt)}
                          className="p-2 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white backdrop-blur-md transition-all shadow-md cursor-pointer border border-white/20"
                          title="Edit Event"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt)}
                          className="p-2 rounded-full bg-slate-900/80 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-md cursor-pointer border border-white/20"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Event Content Details */}
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-snug">
                          {evt.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                          {evt.description || 'Cloud Stack Club Official Event. Registration is currently open.'}
                        </p>
                      </div>

                      {/* Config Badges: Teams, Max Seats */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        {evt.supports_teams && (
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Users2 className="w-3.5 h-3.5" />
                            <span>Teams (Max {evt.max_team_size || 4})</span>
                          </span>
                        )}
                        {evt.max_registrations && (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Max {evt.max_registrations} seats</span>
                          </span>
                        )}
                        {evt.registration_enabled && evt.registration_start && (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Registration Starts: {new Date(evt.registration_start).toLocaleDateString()}</span>
                          </span>
                        )}
                        {evt.registration_enabled && evt.registration_end && (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Registration Ends: {new Date(evt.registration_end).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>

                      {/* Date, Time, Venue & PDF View */}
                      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold truncate">
                            <span>📅 {evt.date ? new Date(evt.date).toLocaleDateString() : 'TBD'}</span>
                            {evt.start_time && (
                              <span className="flex items-center gap-0.5 text-blue-600 dark:text-sky-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatEventTime(evt.start_time)}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate font-semibold">
                            📍 {evt.location || 'Chandigarh University'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(evt.registration_enabled || hasEventRegistrations(evt)) && (
                            <button
                              type="button"
                              onClick={() => setViewRegsEvent(evt)}
                              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="View registered students for this event"
                            >
                              <Users className="w-3.5 h-3.5 text-blue-500" />
                              <span>Registrations</span>
                            </button>
                          )}

                          {evt.pdf_url && (
                            <button
                              type="button"
                              onClick={() => setSelectedEventPdf({ url: evt.pdf_url!, title: evt.title })}
                              className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 hover:bg-blue-100 text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          </div>
        )}

        {/* Tab Content 4: Registration Form Builder */}
        {activeTab === 'forms' && (
          <EventFormBuilder events={eventsList} />
        )}

        {/* Tab Content 5: Contact & Feedbacks Management */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-6">
            {/* Stat Cards Header */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="neumorphic-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-500">Total Feedbacks</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">{feedbacksList.length}</div>
                </div>
              </div>

              <div className="neumorphic-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-500">Pending</div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {feedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length}
                  </div>
                </div>
              </div>

              <div className="neumorphic-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-500">In Progress</div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {feedbacksList.filter((f) => f.status === 'in_progress').length}
                  </div>
                </div>
              </div>

              <div className="neumorphic-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-500">Resolved</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {feedbacksList.filter((f) => f.status === 'resolved' || f.status === 'responded').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="neumorphic-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(['all', 'pending', 'in_progress', 'resolved', 'archived'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFeedbackFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                      feedbackFilter === st
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Search Bar & Download PDF Button Side-by-Side */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sender, email..."
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportFeedbacksPdf}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Download filtered feedbacks as PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Feedbacks Data Table */}
            <div className="neumorphic-card overflow-hidden">
              {loadingFeedbacks ? (
                <div className="p-12 text-center text-slate-400 text-sm font-semibold">
                  Loading user feedbacks...
                </div>
              ) : feedbacksList.filter((f) => {
                  const matchSearch =
                    f.name.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
                    f.email.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
                    f.message.toLowerCase().includes(feedbackSearch.toLowerCase());
                  if (!matchSearch) return false;
                  if (feedbackFilter === 'pending') return f.status === 'pending' || f.status === 'unread';
                  if (feedbackFilter === 'in_progress') return f.status === 'in_progress';
                  if (feedbackFilter === 'resolved') return f.status === 'resolved' || f.status === 'responded';
                  if (feedbackFilter === 'archived') return f.status === 'archived';
                  return true;
                }).length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">No feedbacks found</div>
                  <div className="text-xs text-slate-400">User submissions from the Contact Us form will appear here.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Sender Details</th>
                        <th className="py-3 px-4">Message / Feedback</th>
                        <th className="py-3 px-4">Submitted Date</th>
                        <th className="py-3 px-4">Status & Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 text-xs">
                      {feedbacksList
                        .filter((f) => {
                          const matchSearch =
                            f.name.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
                            f.email.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
                            f.message.toLowerCase().includes(feedbackSearch.toLowerCase());
                          if (!matchSearch) return false;
                          if (feedbackFilter === 'pending') return f.status === 'pending' || f.status === 'unread';
                          if (feedbackFilter === 'in_progress') return f.status === 'in_progress';
                          if (feedbackFilter === 'resolved') return f.status === 'resolved' || f.status === 'responded';
                          if (feedbackFilter === 'archived') return f.status === 'archived';
                          return true;
                        })
                        .map((f, idx) => (
                          <tr key={f.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3.5 px-4 space-y-0.5 min-w-[160px]">
                              <div className="font-bold text-slate-900 dark:text-white">{f.name}</div>
                              <a
                                href={`mailto:${f.email}`}
                                className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline font-mono"
                              >
                                {f.email}
                              </a>
                            </td>
                            <td className="py-3.5 px-4 min-w-[280px]">
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium leading-relaxed max-w-xl">
                                {f.message}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                              {f.created_at
                                ? `${new Date(f.created_at).toLocaleDateString('en-GB')}, ${new Date(f.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                                : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <CustomSelect
                                value={
                                  f.status === 'unread'
                                    ? 'pending'
                                    : f.status === 'responded'
                                    ? 'resolved'
                                    : f.status
                                }
                                onChange={(newVal) => handleUpdateFeedbackStatus(f.id, newVal)}
                                options={[
                                  { value: 'pending', label: '⏳ Pending' },
                                  { value: 'in_progress', label: '🔄 In Progress' },
                                  { value: 'resolved', label: '✅ Resolved' },
                                  { value: 'archived', label: '📁 Archived' },
                                ]}
                                triggerClassName={`min-w-[160px] w-auto h-9 px-3.5 rounded-xl text-xs font-bold border flex items-center justify-between gap-2 transition-all cursor-pointer whitespace-nowrap ${
                                  f.status === 'pending' || f.status === 'unread'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : f.status === 'in_progress'
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-sky-300 border-blue-500/30'
                                    : f.status === 'resolved' || f.status === 'responded'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                                }`}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        <Modal isOpen={isCreateEventOpen} onClose={() => setIsCreateEventOpen(false)} title="Create New Event">
          <form onSubmit={handleCreateEventSubmit} className="space-y-4">
            {/* Event Title & Event Category Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={newEventData.title}
                  onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                  placeholder="e.g. Elevate - X"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Category *
                </label>
                <CustomSelect
                  value={newEventData.category}
                  onChange={(val) => setNewEventData({ ...newEventData, category: val })}
                  placeholder="Select Category"
                  options={EVENT_CATEGORY_OPTIONS}
                  triggerClassName="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer flex items-center justify-between text-xs font-semibold text-left"
                />
              </div>
            </div>

            {/* Identical Width Side-by-Side 2-Column Media Upload Grid (Event Poster & Event PDF) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Column 1: EVENT POSTER (IMAGE) */}
              <div className="min-w-0">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Event Poster</span>
                </label>

                {eventPosterFile ? (
                  <div className="p-2 rounded-2xl bg-blue-50/80 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 flex items-center justify-between gap-1.5 h-12">
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                      <img
                        src={URL.createObjectURL(eventPosterFile)}
                        alt="Poster Preview"
                        className="w-7 h-7 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                        onClick={() => setSelectedEventPoster({ url: URL.createObjectURL(eventPosterFile), title: newEventData.title || 'Event' })}
                      />
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        {eventPosterFile.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEventPosterFile(null)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                      title="Remove Poster"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (!file.type.startsWith('image/')) {
                            alert('Only image files (PNG, JPG, WEBP) are accepted.');
                            return;
                          }
                          setEventPosterFile(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-center transition-all space-y-0.5 h-12 flex flex-col justify-center items-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                        <span>Upload Poster</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: EVENT PDF (DOCUMENT) */}
              <div className="min-w-0">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Event PDF</span>
                </label>

                {eventPdfFile ? (
                  <div className="p-2 rounded-2xl bg-blue-50/80 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 flex items-center justify-between gap-1.5 h-12">
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        {eventPdfFile.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEventPdfFile(null)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                      title="Remove PDF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
                          setEventPdfFile(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-center transition-all space-y-0.5 h-12 flex flex-col justify-center items-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                        <span>Upload PDF</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

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

            {/* Registration & Team Configuration Section */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Registration & Team Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={newEventData.registration_enabled}
                    onChange={(e) => setNewEventData({ ...newEventData, registration_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Registration</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={newEventData.supports_teams}
                    onChange={(e) => setNewEventData({ ...newEventData, supports_teams: e.target.checked, max_team_size: e.target.checked ? 4 : 1 })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Allow Team Registrations</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newEventData.supports_teams && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Max Team Size (Members)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={newEventData.max_team_size}
                      onChange={(e) => setNewEventData({ ...newEventData, max_team_size: parseInt(e.target.value) || 2 })}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className={newEventData.supports_teams ? '' : 'sm:col-span-2'}>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Max Total Registrations
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 100 (leave empty for unlimited)"
                    value={newEventData.max_registrations}
                    onChange={(e) => setNewEventData({ ...newEventData, max_registrations: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {newEventData.registration_enabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                        Registration Start Window
                      </label>
                      <input
                        type="date"
                        value={newEventData.registration_start}
                        onChange={(e) => setNewEventData({ ...newEventData, registration_start: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                        Registration End / Deadline
                      </label>
                      <input
                        type="date"
                        value={newEventData.registration_end}
                        onChange={(e) => setNewEventData({ ...newEventData, registration_end: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {newEventData.registration_end && newEventData.date && new Date(newEventData.registration_end) > new Date(newEventData.date) && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Warning: Registration Deadline ({newEventData.registration_end}) crosses after Event Date ({newEventData.date}).</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="md" disabled={isUploadingMedia} className="w-full">
                {isUploadingMedia ? 'Publishing Event...' : 'Publish Event'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Event Modal */}
        <Modal isOpen={!!editingEvent} onClose={() => setEditingEvent(null)} title={`Edit Event — ${editingEvent?.title || ''}`}>
          <form onSubmit={handleEditEventSubmit} className="space-y-4">
            {/* Event Title & Event Category Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={editEventData.title}
                  onChange={(e) => setEditEventData({ ...editEventData, title: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Category *
                </label>
                <CustomSelect
                  value={editEventData.category}
                  onChange={(val) => setEditEventData({ ...editEventData, category: val })}
                  placeholder="Select Category"
                  options={EVENT_CATEGORY_OPTIONS}
                  triggerClassName="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer flex items-center justify-between text-xs font-semibold text-left"
                />
              </div>
            </div>

            {/* Identical Width Side-by-Side 2-Column Media Upload Grid (Poster & PDF) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Column 1: EVENT POSTER (IMAGE) */}
              <div className="min-w-0">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Event Poster</span>
                </label>

                {editPosterFile ? (
                  <div className="p-2.5 rounded-2xl bg-blue-50/80 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 flex items-center justify-between gap-1.5 h-12">
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                      <img
                        src={URL.createObjectURL(editPosterFile)}
                        alt="Poster Preview"
                        className="w-7 h-7 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                        onClick={() => setSelectedEventPoster({ url: URL.createObjectURL(editPosterFile), title: editingEvent?.title || 'Event' })}
                      />
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        {editPosterFile.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditPosterFile(null)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : editingEvent?.image_url ? (
                  <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-1.5 h-12">
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                      <img
                        src={editingEvent.image_url}
                        alt="Current Poster"
                        className="w-7 h-7 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                        onClick={() => setSelectedEventPoster({ url: editingEvent.image_url!, title: editingEvent.title })}
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">Current Poster</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedEventPoster({ url: editingEvent.image_url!, title: editingEvent.title })}
                        className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-sky-400 text-[10px] font-bold"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEventPoster(editingEvent.id)}
                        className="px-2 py-1 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                        title="Delete poster from database"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && setEditPosterFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-center transition-all space-y-0.5 h-12 flex flex-col justify-center items-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                        <span>Upload Poster</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: EVENT PDF (DOCUMENT) */}
              <div className="min-w-0">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Event PDF</span>
                </label>

                {editPdfFile ? (
                  <div className="p-2.5 rounded-2xl bg-blue-50/80 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 flex items-center justify-between gap-1.5 h-12">
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        {editPdfFile.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditPdfFile(null)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : editingEvent?.pdf_url ? (
                  <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-1.5 h-12">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 truncate min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate">Attached PDF</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedEventPdf({ url: editingEvent.pdf_url!, title: editingEvent.title })}
                        className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-sky-400 text-[10px] font-bold"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEventPdf(editingEvent.id)}
                        className="px-2 py-1 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                        title="Delete PDF schedule from database"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => e.target.files?.[0] && setEditPdfFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-center transition-all space-y-0.5 h-12 flex flex-col justify-center items-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                        <span>Upload PDF</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={editEventData.description}
                onChange={(e) => setEditEventData({ ...editEventData, description: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={editEventData.date}
                  onChange={(e) => setEditEventData({ ...editEventData, date: e.target.value })}
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
                  value={editEventData.time}
                  onChange={(e) => setEditEventData({ ...editEventData, time: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={editEventData.location}
                onChange={(e) => setEditEventData({ ...editEventData, location: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
              />
            </div>

            {/* Edit Registration & Team Configuration Section */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Registration & Team Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={editEventData.registration_enabled}
                    onChange={(e) => setEditEventData({ ...editEventData, registration_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Registration</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={editEventData.supports_teams}
                    onChange={(e) => setEditEventData({ ...editEventData, supports_teams: e.target.checked, max_team_size: e.target.checked ? 4 : 1 })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Allow Team Registrations</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {editEventData.supports_teams && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Max Team Size (Members)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={editEventData.max_team_size}
                      onChange={(e) => setEditEventData({ ...editEventData, max_team_size: parseInt(e.target.value) || 2 })}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className={editEventData.supports_teams ? '' : 'sm:col-span-2'}>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Max Total Registrations
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 100 (leave empty for unlimited)"
                    value={editEventData.max_registrations}
                    onChange={(e) => setEditEventData({ ...editEventData, max_registrations: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {editEventData.registration_enabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                        Registration Start Window
                      </label>
                      <input
                        type="date"
                        value={editEventData.registration_start}
                        onChange={(e) => setEditEventData({ ...editEventData, registration_start: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                        Registration End / Deadline
                      </label>
                      <input
                        type="date"
                        value={editEventData.registration_end}
                        onChange={(e) => setEditEventData({ ...editEventData, registration_end: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {editEventData.registration_end && editEventData.date && new Date(editEventData.registration_end) > new Date(editEventData.date) && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Warning: Registration Deadline ({editEventData.registration_end}) crosses after Event Date ({editEventData.date}).</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="md" disabled={isUploadingMedia} className="w-full">
                {isUploadingMedia ? 'Saving Changes...' : 'Save Changes'}
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

        {/* Event PDF Viewer Modal */}
        <EventPdfModal
          isOpen={!!selectedEventPdf}
          onClose={() => setSelectedEventPdf(null)}
          pdfUrl={selectedEventPdf?.url || null}
          eventTitle={selectedEventPdf?.title || 'Event'}
        />

        {/* Event Poster Viewer Modal */}
        <EventPosterModal
          isOpen={!!selectedEventPoster}
          onClose={() => setSelectedEventPoster(null)}
          imageUrl={selectedEventPoster?.url || null}
          eventTitle={selectedEventPoster?.title || 'Event'}
        />

        {/* View Event Registrations Modal */}
        <ViewRegistrationsModal
          isOpen={!!viewRegsEvent}
          onClose={() => setViewRegsEvent(null)}
          event={viewRegsEvent}
        />

        {/* Global Themed Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModalConfig.onConfirm}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          variant={confirmModalConfig.variant}
        />

        {/* Global Bottom Floating Toast Notification (Disappears in 2 seconds) */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 backdrop-blur-md flex items-center gap-3 min-w-[280px] max-w-md pointer-events-none"
            >
              <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-bold leading-snug">{actionSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
