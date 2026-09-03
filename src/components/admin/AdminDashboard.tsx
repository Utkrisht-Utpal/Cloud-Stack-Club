import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  Shield,
  RefreshCw,
  Camera,
  ArrowUp,
  ScrollText,
  Mail,
  Radio,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clubLogoImg from '../../assets/images/club-logo-transparent.png';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { VerificationDocModal } from './VerificationDocModal';
import { ManageRoleModal } from './ManageRoleModal';
import { RolesManagementModal } from './RolesManagementModal';
import { EventPdfModal } from './EventPdfModal';
import { EventPosterModal } from './EventPosterModal';
import { EventFormBuilder } from './EventFormBuilder';
import { ViewRegistrationsModal } from './ViewRegistrationsModal';
import { GalleryManagement } from './GalleryManagement';
import { TeamMediaManagement } from './TeamMediaManagement';
import { EventRulesModal } from './EventRulesModal';
import { RejectMemberModal } from './RejectMemberModal';
import { BroadcastEventModal } from './BroadcastEventModal';
import { UpdateFeedbackStatusModal } from './UpdateFeedbackStatusModal';
import { EmailLogsManagement } from './EmailLogsManagement';
import { NoticeManagementModal } from './NoticeManagementModal';
import { DiscrepancyManagementModal } from './DiscrepancyManagementModal';
import { getActiveNotices } from '../../services/notices';
import { getAllDiscrepancies } from '../../services/discrepancies';
import {
  sendMemberApprovalEmail,
  sendMemberRejectionEmail,
  sendContactUsStatusEmail,
  sendEventFeedbackEmail,
} from '../../services/email';
import { getEventRegistrationCountsMap } from '../../services/registrationForms';
import { CustomSelect } from '../ui/CustomSelect';
import { DatePicker } from '../ui/DatePicker';
import { TimePicker } from '../ui/TimePicker';
import { generateUUID } from '../../utils/uuid';
import { generateSlug } from '../../utils/slug';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AlertModal } from '../ui/AlertModal';
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
  getAdminEvents,
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
import {
  getAllFeedbacks,
  updateFeedbackStatus,
  getAllEventFeedbacks,
  updateEventFeedbackStatus,
  fetchFreshContactFeedbacksFromDb,
  fetchFreshEventFeedbacksFromDb,
} from '../../services/feedback';
import { exportFeedbacksToPdf, exportMembersToExcel, exportMembersToPdf } from '../../utils/exportDirectory';
import { validateFileSignature, validatePdfSignature } from '../../lib/fileValidation';
import type { Member, Event, Role, ContactFeedback, EventFeedback, FeedbackStatus } from '../../types/database';

const EVENT_CATEGORY_OPTIONS = [
  { value: 'Hackathons', label: 'Hackathons' },
  { value: 'Ideathons', label: 'Ideathons' },
  { value: 'Expert Talks', label: 'Expert Talks' },
  { value: 'Industry Visits', label: 'Industry Visits' },
  { value: 'Workshops', label: 'Workshops' },
  { value: 'Bootcamps', label: 'Bootcamps' },
];

const getInitialContactFeedbacksCache = (): ContactFeedback[] => {
  try {
    const cached = localStorage.getItem('csc_contact_feedbacks');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

const getInitialEventFeedbacksCache = (): EventFeedback[] => {
  try {
    const cached = localStorage.getItem('csc_event_feedbacks');
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

interface AdminDashboardProps {
  mobileNavOpen?: boolean;
  setMobileNavOpen?: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ mobileNavOpen = false, setMobileNavOpen }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'events' | 'forms' | 'feedbacks' | 'gallery' | 'team' | 'emails'>('members');
  const [memberViewTab, setMemberViewTab] = useState<'applications' | 'directory'>('directory');
  const [memberFilter, setMemberFilter] = useState<'all' | 'member' | 'core'>('all');
  const [isSyncingMembers, setIsSyncingMembers] = useState(false);
  const [sortRecentMembers, setSortRecentMembers] = useState(false);

  // Email and Rejection / Broadcast / Feedback States
  const [rejectingMember, setRejectingMember] = useState<Member | null>(null);
  const [broadcastingEvent, setBroadcastingEvent] = useState<Event | null>(null);
  const [pendingStatusFeedback, setPendingStatusFeedback] = useState<{
    feedback: any;
    isEvent: boolean;
    targetStatus: FeedbackStatus;
  } | null>(null);

  // Notice Board State
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [activeNoticeCount, setActiveNoticeCount] = useState(0);

  const checkActiveNotices = React.useCallback(async () => {
    try {
      const active = await getActiveNotices();
      setActiveNoticeCount(active.length);
    } catch {}
  }, []);

  useEffect(() => {
    checkActiveNotices();
    window.addEventListener('csc-notice-updated', checkActiveNotices);
    return () => window.removeEventListener('csc-notice-updated', checkActiveNotices);
  }, [checkActiveNotices]);

  // Discrepancies & Student Queries State
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);

  const checkDiscrepancies = React.useCallback(async () => {
    try {
      const list = await getAllDiscrepancies();
      setDiscrepancyCount(list.length);
    } catch {}
  }, []);

  useEffect(() => {
    checkDiscrepancies();
    window.addEventListener('csc-discrepancy-updated', checkDiscrepancies);
    return () => window.removeEventListener('csc-discrepancy-updated', checkDiscrepancies);
  }, [checkDiscrepancies]);

  // Pending Applications State
  const [pendingApplications, setPendingApplications] = useState<Member[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [selectedDocFile, setSelectedDocFile] = useState<{ path: string; name: string } | null>(null);
  const [, setActionSuccess] = useState<string | null>(null);
  const [, setActionError] = useState<string | null>(null);

  // Helper to get the calendar date immediately before a given YYYY-MM-DD
  const getDayBefore = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Active Members & Roles State
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Member | null>(null);
  const [isRolesCrudModalOpen, setIsRolesCrudModalOpen] = useState(false);

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
  const [teamSizeWarning, setTeamSizeWarning] = useState<string | null>(null);
  const [newEventData, setNewEventData] = useState({
    title: '',
    category: '',
    description: '',
    date: '',
    time: '10:00',
    location: '',
    rules: '',
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
    rules: '',
    registration_enabled: true,
    registration_start: '',
    registration_end: '',
    supports_teams: false,
    max_team_size: 1,
    max_registrations: '',
  });
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);

  // Event Rules Modal State
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [activeRulesTarget, setActiveRulesTarget] = useState<'create' | 'edit'>('create');

  // Global Themed Alert / Warning Modal State
  const [alertModalConfig, setAlertModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'warning' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
  });

  const showAlert = (title: string, message: string, variant: 'warning' | 'error' | 'info' = 'warning') => {
    setAlertModalConfig({
      isOpen: true,
      title,
      message,
      variant,
    });
  };

  // Contact & Event Feedbacks State (Separate Cached Tables)
  const [contactFeedbacksList, setContactFeedbacksList] = useState<ContactFeedback[]>(getInitialContactFeedbacksCache);
  const [eventFeedbacksList, setEventFeedbacksList] = useState<EventFeedback[]>(getInitialEventFeedbacksCache);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(() => getInitialContactFeedbacksCache().length === 0 && getInitialEventFeedbacksCache().length === 0);
  const [feedbackViewTab, setFeedbackViewTab] = useState<'contact' | 'event'>('contact');
  const [selectedFeedbackEvent, setSelectedFeedbackEvent] = useState<string>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'archived'>('all');
  const [isSyncingFeedbacks, setIsSyncingFeedbacks] = useState(false);
  const [viewingFeedback, setViewingFeedback] = useState<any | null>(null);

  const filteredContactFeedbacks = useMemo(() => {
    return contactFeedbacksList.filter((f) => {
      if (feedbackFilter === 'pending' && !(f.status === 'pending' || f.status === 'unread')) return false;
      if (feedbackFilter === 'in_progress' && f.status !== 'in_progress') return false;
      if (feedbackFilter === 'resolved' && !(f.status === 'resolved' || f.status === 'responded')) return false;
      if (feedbackFilter === 'archived' && f.status !== 'archived') return false;

      const query = feedbackSearch.toLowerCase().trim();
      if (query) {
        const matchName = (f.name || '').toLowerCase().includes(query);
        const matchEmail = (f.email || '').toLowerCase().includes(query);
        const matchMsg = (f.message || '').toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchMsg) {
          return false;
        }
      }

      return true;
    });
  }, [contactFeedbacksList, feedbackFilter, feedbackSearch]);

  const filteredEventFeedbacks = useMemo(() => {
    return eventFeedbacksList.filter((f) => {
      if (selectedFeedbackEvent !== 'all') {
        if (String(f.event_id || '').trim().toLowerCase() !== selectedFeedbackEvent.trim().toLowerCase()) {
          return false;
        }
      }

      if (feedbackFilter === 'pending' && !(f.status === 'pending' || f.status === 'unread')) return false;
      if (feedbackFilter === 'in_progress' && f.status !== 'in_progress') return false;
      if (feedbackFilter === 'resolved' && !(f.status === 'resolved' || f.status === 'responded')) return false;
      if (feedbackFilter === 'archived' && f.status !== 'archived') return false;

      const query = feedbackSearch.toLowerCase().trim();
      if (query) {
        const matchName = (f.name || '').toLowerCase().includes(query);
        const matchEmail = (f.email || '').toLowerCase().includes(query);
        const matchUid = (f.university_id || '').toLowerCase().includes(query);
        const matchRegId = (f.registration_id || '').toLowerCase().includes(query);
        const matchMsg = (f.message || '').toLowerCase().includes(query);
        const matchedEvent = eventsList.find((e) => e.id === f.event_id);
        const eventTitleStr = (matchedEvent?.title || f.event_title || '').toLowerCase();
        const matchEvent = eventTitleStr.includes(query);
        if (!matchName && !matchEmail && !matchUid && !matchRegId && !matchMsg && !matchEvent) {
          return false;
        }
      }

      return true;
    });
  }, [eventFeedbacksList, eventsList, selectedFeedbackEvent, feedbackFilter, feedbackSearch]);

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
      const [list, roles] = await Promise.all([
        getMembers().catch((err) => {
          console.warn('Could not load members:', err);
          return [];
        }),
        getRoles().catch((err) => {
          console.warn('Could not load roles:', err);
          return [];
        }),
      ]);
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
        getAdminEvents().catch((err) => {
          console.warn('Could not load admin events, falling back to public events:', err);
          return getEvents().catch(() => []);
        }),
        getEventRegistrationCountsMap().catch((err) => {
          console.warn('Could not load registration counts:', err);
          return {};
        }),
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
      const [cFeedbacks, eFeedbacks] = await Promise.all([
        getAllFeedbacks(),
        getAllEventFeedbacks(),
      ]);
      if (cFeedbacks) setContactFeedbacksList(cFeedbacks);
      if (eFeedbacks) setEventFeedbacksList(eFeedbacks);
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleSyncFeedbacks = async () => {
    setIsSyncingFeedbacks(true);
    try {
      const [freshContact, freshEvent] = await Promise.all([
        fetchFreshContactFeedbacksFromDb(),
        fetchFreshEventFeedbacksFromDb(),
      ]);
      setContactFeedbacksList(freshContact);
      setEventFeedbacksList(freshEvent);
      setActionSuccess(
        `Synced from Database: ${freshContact.length} contact & ${freshEvent.length} event feedback(s)!`
      );
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Error syncing feedbacks from database:', err);
      await loadAllFeedbacks();
      setActionSuccess('Feedbacks synced successfully!');
      setTimeout(() => setActionSuccess(null), 2000);
    } finally {
      setIsSyncingFeedbacks(false);
    }
  };

  const handleConfirmFeedbackStatusUpdate = async (
    targetFeedback: any,
    newStatus: FeedbackStatus,
    adminNote: string,
    shouldSendEmail: boolean
  ) => {
    const id = targetFeedback.id;
    const isEvent = feedbackViewTab === 'event' || !!targetFeedback.event_id || !!targetFeedback.event_title;

    if (isEvent) {
      setEventFeedbacksList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );
      const success = await updateEventFeedbackStatus(id, newStatus);
      if (success) {
        setActionSuccess(`Event feedback status updated to "${newStatus.toUpperCase()}"`);
        setTimeout(() => setActionSuccess(null), 2000);

        if (shouldSendEmail && targetFeedback.email) {
          sendEventFeedbackEmail(
            { name: targetFeedback.name, email: targetFeedback.email, event_title: targetFeedback.event_title },
            adminNote
          ).catch((e) => console.warn('Could not dispatch event feedback email:', e));
        }
      }
    } else {
      setContactFeedbacksList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );
      const success = await updateFeedbackStatus(id, newStatus);
      if (success) {
        setActionSuccess(`Contact inquiry status updated to "${newStatus.toUpperCase()}"`);
        setTimeout(() => setActionSuccess(null), 2000);

        if (shouldSendEmail && targetFeedback.email) {
          sendContactUsStatusEmail(
            { name: targetFeedback.name, email: targetFeedback.email, subject: targetFeedback.subject },
            newStatus,
            adminNote
          ).catch((e) => console.warn('Could not dispatch contact status email:', e));
        }
      }
    }
  };

  const handleExportFeedbacksPdf = () => {
    if (feedbackViewTab === 'event') {
      exportFeedbacksToPdf(filteredEventFeedbacks as any, feedbackFilter, feedbackSearch, eventsList);
    } else {
      exportFeedbacksToPdf(filteredContactFeedbacks as any, feedbackFilter, feedbackSearch);
    }
    setActionSuccess('Feedbacks PDF downloaded successfully!');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  const handleDeleteEventPoster = async (eventId: string) => {
    const targetEvent = eventsList.find((e) => e.id === eventId) || editingEvent;
    const currentImageUrl = targetEvent?.image_url || editingEvent?.image_url;

    setEditingEvent((prev) => (prev ? { ...prev, image_url: null } : null));
    setEditPosterFile(null);
    setEventsList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, image_url: null } : e))
    );

    await deleteEventPosterAdmin(eventId, currentImageUrl);
    setActionSuccess('Event poster deleted from storage and database!');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  const handleDeleteEventPdf = async (eventId: string) => {
    const targetEvent = eventsList.find((e) => e.id === eventId) || editingEvent;
    const currentPdfUrl = targetEvent?.pdf_url || editingEvent?.pdf_url;

    setEditingEvent((prev) => (prev ? { ...prev, pdf_url: null } : null));
    setEditPdfFile(null);
    setEventsList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, pdf_url: null } : e))
    );

    await deleteEventPdfAdmin(eventId, currentPdfUrl);
    setActionSuccess('Event PDF schedule deleted from storage and database!');
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

  // Stabilize background behind the overlay by locking body scrolling
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

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
    onConfirm: () => { },
  });

  const handleApprove = async (member: Member) => {
    try {
      await approveMemberApplicationService(member.id, member.verification_file_url);
      setActionSuccess(`Approved ${member.name} (${member.registration_id}). Verification document deleted.`);
      loadPendingApps();
      loadAllMembers();
      setTimeout(() => setActionSuccess(null), 2000);

      // Asynchronously dispatch official welcome email via Outlook
      sendMemberApprovalEmail(member).catch((e) => console.warn('Could not dispatch approval email:', e));
    } catch (err: any) {
      setActionSuccess(`Approval failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setActionSuccess(null), 2000);
    }
  };

  const handleReject = (member: Member) => {
    setRejectingMember(member);
  };

  const handleConfirmReject = async (member: Member, reason: string) => {
    setPendingApplications((prev) => prev.filter((app) => app.id !== member.id));
    setActionSuccess(`Rejected application for ${member.name}. Member status set to inactive.`);
    setTimeout(() => setActionSuccess(null), 2000);

    try {
      await rejectMemberApplicationService(member.id, member.verification_file_url, reason);
      // Dispatch official rejection email via Outlook
      await sendMemberRejectionEmail(member, reason);
    } catch (err: any) {
      console.warn('Rejection error:', err);
    }
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

    if (newEventData.registration_enabled && newEventData.registration_end && newEventData.date) {
      const regEnd = newEventData.registration_end.split('T')[0];
      const eventDate = newEventData.date.split('T')[0];

      if (regEnd >= eventDate) {
        setActionError(
          `Registration deadline (${regEnd}) cannot be on or after the event date (${eventDate}). The latest allowed registration deadline is ${getDayBefore(eventDate)}.`
        );
        setTimeout(() => setActionError(null), 4500);
        return;
      }
    }

    setIsUploadingMedia(true);
    try {
      const eventId = generateUUID();
      const autoSlug = generateSlug(newEventData.title) || `event-${Date.now()}`;

      let pdfUrl: string | null = null;
      if (eventPdfFile) {
        const pdfVal = await validatePdfSignature(eventPdfFile);
        if (!pdfVal.isValid) {
          setActionError(pdfVal.error || 'Invalid PDF file. Only authentic PDF documents under 2MB are accepted.');
          setIsUploadingMedia(false);
          return;
        }
        pdfUrl = await uploadEventPdf(eventPdfFile, eventId);
      }

      let imageUrl: string | null = null;
      if (eventPosterFile) {
        const imgVal = await validateFileSignature(eventPosterFile);
        if (!imgVal.isValid) {
          setActionError(imgVal.error || 'Invalid poster image. Only authentic JPG, PNG, WebP images under 1MB are accepted.');
          setIsUploadingMedia(false);
          return;
        }
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
        rules: newEventData.rules.trim() || null,
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
        rules: '',
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
      showAlert('Event Creation Failed', err?.message || 'Unknown error occurred while creating event.', 'error');
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
      rules: evt.rules || '',
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

    if (editEventData.registration_enabled && editEventData.registration_end && editEventData.date) {
      const regEnd = editEventData.registration_end.split('T')[0];
      const eventDate = editEventData.date.split('T')[0];

      if (regEnd >= eventDate) {
        setActionError(
          `Registration deadline (${regEnd}) cannot be on or after the event date (${eventDate}). The latest allowed registration deadline is ${getDayBefore(eventDate)}.`
        );
        setTimeout(() => setActionError(null), 4500);
        return;
      }
    }

    setIsUploadingMedia(true);
    try {
      let pdfUrl = editingEvent.pdf_url;
      if (editPdfFile) {
        const pdfVal = await validatePdfSignature(editPdfFile);
        if (!pdfVal.isValid) {
          setActionError(pdfVal.error || 'Invalid PDF file. Only authentic PDF documents under 2MB are accepted.');
          setIsUploadingMedia(false);
          return;
        }
        pdfUrl = await uploadEventPdf(editPdfFile, editingEvent.id);
      }

      let imageUrl = editingEvent.image_url;
      if (editPosterFile) {
        const imgVal = await validateFileSignature(editPosterFile);
        if (!imgVal.isValid) {
          setActionError(imgVal.error || 'Invalid poster image. Only authentic JPG, PNG, WebP images under 1MB are accepted.');
          setIsUploadingMedia(false);
          return;
        }
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
        slug: generateSlug(editEventData.title.trim()) || editingEvent.slug,
        category: editEventData.category || null,
        description: editEventData.description.trim() || null,
        date: editEventData.date,
        start_time: editEventData.time,
        location: editEventData.location.trim(),
        rules: editEventData.rules.trim() || null,
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
      showAlert('Event Update Failed', err?.message || 'Unknown error occurred while updating event.', 'error');
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

  const handleSyncRecords = async () => {
    setIsSyncingMembers(true);
    try {
      await Promise.all([
        loadPendingApps(),
        loadAllMembers(),
        checkDiscrepancies(),
      ]);
      window.dispatchEvent(new CustomEvent('csc-discrepancy-updated'));
      setActionSuccess('Member, Core & Discrepancy records synced successfully!');
      setTimeout(() => setActionSuccess(null), 2000);
    } catch (err) {
      console.error('Error syncing records:', err);
    } finally {
      setIsSyncingMembers(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const list = membersList.filter((m) => {
      const query = memberSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        (m.uid || '').toLowerCase().includes(query) ||
        m.registration_id.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (memberFilter === 'member' && m.is_core_member) return false;
      if (memberFilter === 'core' && !m.is_core_member) return false;

      return true;
    });

    if (sortRecentMembers) {
      return [...list].sort((a, b) => {
        const dateA = new Date(a.created_at || a.joined_at || 0).getTime();
        const dateB = new Date(b.created_at || b.joined_at || 0).getTime();
        return dateB - dateA;
      });
    }

    return list;
  }, [membersList, memberSearch, memberFilter, sortRecentMembers]);

  const filteredApplications = useMemo(() => {
    const list = pendingApplications.filter((app) => {
      const query = memberSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        app.name.toLowerCase().includes(query) ||
        (app.uid || '').toLowerCase().includes(query) ||
        app.registration_id.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      return true;
    });

    if (sortRecentMembers) {
      return [...list].sort((a, b) => {
        const dateA = new Date(a.created_at || a.joined_at || 0).getTime();
        const dateB = new Date(b.created_at || b.joined_at || 0).getTime();
        return dateB - dateA;
      });
    }

    return list;
  }, [pendingApplications, memberSearch, sortRecentMembers]);

  const handleExportMembersExcel = () => {
    const currentMembers =
      memberViewTab === 'applications'
        ? (filteredApplications as any)
        : filteredMembers;
    exportMembersToExcel(
      currentMembers,
      memberViewTab === 'applications' ? 'all' : memberFilter === 'core' ? 'core' : memberFilter === 'member' ? 'members' : 'all',
      memberSearch
    );
    setActionSuccess('Downloaded members list as Excel spreadsheet!');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  const handleExportMembersPdf = () => {
    const currentMembers =
      memberViewTab === 'applications'
        ? (filteredApplications as any)
        : filteredMembers;
    exportMembersToPdf(
      currentMembers,
      memberViewTab === 'applications' ? 'all' : memberFilter === 'core' ? 'core' : memberFilter === 'member' ? 'members' : 'all',
      memberSearch
    );
    setActionSuccess('Downloaded members list as PDF document!');
    setTimeout(() => setActionSuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pt-20 sm:pt-28 pb-16 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">

        {/* ── Management Navigation ── */}

        {/* MOBILE: Fullscreen Navigation Overlay — triggered by hamburger in Navbar */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden fixed inset-0 z-50 w-full h-full bg-slate-50/65 dark:bg-slate-950/65 backdrop-blur-2xl text-slate-900 dark:text-white flex flex-col justify-between overflow-hidden"
            >
              {/* Top Header */}
              <div className="p-4 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between bg-white/65 dark:bg-slate-900/65 backdrop-blur-xl shadow-sm shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={clubLogoImg}
                    alt="Cloud Stack Club"
                    className="w-9 h-9 object-contain shrink-0 drop-shadow-md"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      Cloud Stack <span className="text-blue-600 dark:text-sky-400">Club</span>
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                      Admin Management Dashboard
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileNavOpen && setMobileNavOpen(false)}
                  className="p-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shrink-0"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Navigation List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-none">
                {/* Members */}
                <button
                  onClick={() => { setActiveTab('members'); setMobileNavOpen && setMobileNavOpen(false); }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    activeTab === 'members'
                      ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-850/80'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-sky-400'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 font-extrabold text-sm">Members Management</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}>
                      {membersList.length}
                    </span>
                    {pendingApplications.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-400 text-slate-950 font-black">
                        {pendingApplications.length}
                      </span>
                    )}
                  </div>
                </button>

                {/* Events */}
                <button
                  onClick={() => { setActiveTab('events'); setMobileNavOpen && setMobileNavOpen(false); }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    activeTab === 'events'
                      ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-850/80'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'events' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 font-extrabold text-sm">Events Management</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shrink-0 ${
                    activeTab === 'events' ? 'bg-white/20 text-white' : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}>
                    {eventsList.length}
                  </span>
                </button>

                {/* Registration Form Builder */}
                <button
                  onClick={() => { setActiveTab('forms'); setMobileNavOpen && setMobileNavOpen(false); }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    activeTab === 'forms'
                      ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-850/80'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'forms' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 font-extrabold text-sm">Form Builder</span>
                </button>

                {/* Contact & Feedbacks */}
                <button
                  onClick={() => { setActiveTab('feedbacks'); setMobileNavOpen && setMobileNavOpen(false); }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    activeTab === 'feedbacks'
                      ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-850/80'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'feedbacks' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 font-extrabold text-sm">Contact &amp; Feedbacks</span>
                  {(contactFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length +
                    eventFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length) > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-400 text-slate-950 font-black shrink-0">
                      {contactFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length +
                        eventFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length}
                    </span>
                  )}
                </button>

                {/* Event Gallery */}
                <button
                  onClick={() => { setActiveTab('gallery'); setMobileNavOpen && setMobileNavOpen(false); }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    activeTab === 'gallery'
                      ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'gallery' ? 'bg-white/20 text-white' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                  }`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 font-extrabold text-sm">Event Gallery</span>
                </button>

                {/* Our Team */}
                <button
                  onClick={() => { setActiveTab('team'); setMobileNavOpen && setMobileNavOpen(false); }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    activeTab === 'team'
                      ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'team' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-sky-400'
                  }`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 font-extrabold text-sm">Our Team</span>
                </button>

                {/* E-Mails */}
                <button
                  onClick={() => { setActiveTab('emails'); setMobileNavOpen && setMobileNavOpen(false); }}
                  className={`w-full px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
                    activeTab === 'emails'
                      ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeTab === 'emails' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-sky-400'
                  }`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 font-extrabold text-sm">E - Mails</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DESKTOP (sm+): Horizontal scrollable tab bar */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 scrollbar-none w-full min-w-0">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 min-w-fit justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Members<span className="hidden xl:inline"> Management</span></span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black min-w-[18px] text-center">
              {membersList.length}
            </span>
            {pendingApplications.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black min-w-[18px] text-center shadow-sm" title={`${pendingApplications.length} pending application(s)`}>
                {pendingApplications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 min-w-fit justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Events<span className="hidden xl:inline"> Management</span></span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-w-[18px] text-center font-bold">
              {eventsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`flex-1 min-w-fit justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'forms'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span><span className="hidden xl:inline">Registration </span>Form Builder</span>
          </button>

          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`flex-1 min-w-fit justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'feedbacks'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span><span className="hidden xl:inline">Contact &amp; </span>Feedbacks</span>
            {(contactFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length +
              eventFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black min-w-[18px] text-center shadow-sm">
                {contactFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length +
                  eventFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 min-w-fit justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span><span className="hidden xl:inline">Event </span>Gallery</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 min-w-fit justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span><span className="hidden xl:inline">Our </span>Team</span>
          </button>

          <button
            onClick={() => setActiveTab('emails')}
            className={`flex-1 min-w-fit justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'emails'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>Emails</span>
          </button>
        </div>

        {/* Tab Content: Unified Members Management */}
        {activeTab === 'members' && (
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 sm:space-y-6">
            {/* Header with Title & Sync Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Members Management
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage applicant onboarding, active member directory, and executive core council.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsRolesCrudModalOpen(true)}
                  className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span>Roles</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDiscrepancyModalOpen(true)}
                  className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="View Student Discrepancies & CUIMS Issue Reports"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Discrepancy</span>
                  {discrepancyCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white leading-none">
                      {discrepancyCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSyncRecords}
                  disabled={isSyncingMembers}
                  className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMembers ? 'animate-spin text-blue-500' : ''}`} />
                  <span>{isSyncingMembers ? 'Syncing...' : 'Sync Records'}</span>
                </button>
              </div>
            </div>

            {/* 2 Interactive Overview & View Switcher Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Card 1: APPLICATIONS */}
              <button
                type="button"
                onClick={() => setMemberViewTab('applications')}
                className={`p-4 sm:p-6 rounded-3xl text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[120px] ${
                  memberViewTab === 'applications'
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    APPLICATIONS
                  </span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {pendingApplications.length}
                  </span>
                  {pendingApplications.length === 0 ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Queue Clear
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ {pendingApplications.length} Pending Review
                    </span>
                  )}
                </div>
              </button>

              {/* Card 2: ACTIVE DIRECTORY */}
              <button
                type="button"
                onClick={() => setMemberViewTab('directory')}
                className={`p-4 sm:p-6 rounded-3xl text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[120px] ${
                  memberViewTab === 'directory'
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    ACTIVE DIRECTORY
                  </span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {membersList.length}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Verified Members
                  </span>
                </div>
              </button>
            </div>

            {/* Unified Single Row Controls for Search, Filters, and Export Actions */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Box (flex-1 - largest available space) */}
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search name, UID, email, Reg ID..."
                  className="w-full pl-10 pr-4 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-xs border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              {/* Controls Group: Filters + Export Buttons in single row alignment on desktop, responsive wrap on mobile */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between lg:justify-end w-full lg:w-auto shrink-0">
                {/* Filter Pill Buttons (All, Member, Core Member) */}
                {memberViewTab === 'directory' && (
                  <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 overflow-x-auto scrollbar-none max-w-full shrink-0">
                    {(
                      [
                        { id: 'all', label: 'All', count: membersList.length },
                        { id: 'member', label: 'Member', count: membersList.filter((m) => !m.is_core_member).length },
                        { id: 'core', label: 'Core Member', count: membersList.filter((m) => m.is_core_member).length },
                      ] as const
                    ).map((f) => {
                      const isActive = memberFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setMemberFilter(f.id)}
                          className={`h-9 px-2.5 sm:px-3.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span>{f.label}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {f.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons: Excel & PDF */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleExportMembersExcel}
                    className="flex-1 sm:flex-none h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
                    title="Download as Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Download as Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMembersPdf}
                    className="flex-1 sm:flex-none h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-500/50 dark:hover:border-red-500/50 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
                    title="Download as PDF"
                  >
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>Download as PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table Area */}
            {loadingMembers || (memberViewTab === 'applications' && loadingApplications) ? (
              <div className="py-16 text-center text-xs text-slate-500">
                Loading records...
              </div>
            ) : memberViewTab === 'applications' ? (
              filteredApplications.length === 0 ? (
                <div className="py-14 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">All caught up!</p>
                  <p className="text-slate-500">
                    {memberSearch
                      ? 'No applications match your search filter.'
                      : 'There are no pending membership applications to review.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[550px] rounded-2xl border border-slate-200/80 dark:border-slate-800 custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span>MEMBER INFO</span>
                            <button
                              type="button"
                              onClick={() => setSortRecentMembers((prev) => !prev)}
                              className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                                sortRecentMembers
                                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title={sortRecentMembers ? 'Sorting: Most recent added first (click for A-Z)' : 'Click to sort by most recently added'}
                              aria-label="Toggle sort by most recent members"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </th>
                        <th className="py-3.5 px-4 font-bold">IDS & CREDENTIALS</th>
                        <th className="py-3.5 px-4 font-bold">ACADEMIC DETAILS</th>
                        <th className="py-3.5 px-4 font-bold">ROLE STATUS</th>
                        <th className="py-3.5 px-4 text-right font-bold">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {filteredApplications.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs">{app.name}</div>
                              <div className="text-[11px] text-slate-500">{app.email}</div>
                              {app.phone && <div className="text-[10px] text-slate-400">{app.phone}</div>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-blue-600 dark:text-sky-400 font-bold text-xs">
                              {app.registration_id}
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {app.uid ? `UID: ${app.uid}` : 'UID: N/A'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">{app.department || 'N/A'}</div>
                            <div className="text-[11px] text-slate-500">{app.year || 'N/A'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {app.verification_file_url ? (
                              <button
                                onClick={() => setSelectedDocFile({ path: app.verification_file_url!, name: app.name })}
                                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 hover:bg-blue-100 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
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
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleReject(app)}
                                className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
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
              )
            ) : (
              filteredMembers.length === 0 ? (
                <div className="py-14 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  {memberFilter === 'core'
                    ? 'No core members found matching your search or filters.'
                    : memberFilter === 'member'
                    ? 'No general members found matching your search or filters.'
                    : 'No members found matching your search or filters.'}
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[550px] rounded-2xl border border-slate-200/80 dark:border-slate-800 custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span>MEMBER INFO</span>
                            <button
                              type="button"
                              onClick={() => setSortRecentMembers((prev) => !prev)}
                              className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                                sortRecentMembers
                                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title={sortRecentMembers ? 'Sorting: Most recent added first (click for A-Z)' : 'Click to sort by most recently added'}
                              aria-label="Toggle sort by most recent members"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </th>
                        <th className="py-3.5 px-4 font-bold">IDS & CREDENTIALS</th>
                        <th className="py-3.5 px-4 font-bold">ACADEMIC DETAILS</th>
                        <th className="py-3.5 px-4 font-bold">ROLE STATUS</th>
                        <th className="py-3.5 px-4 text-right font-bold">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 flex-wrap">
                                <span>{member.name}</span>
                                {member.is_core_member && member.role?.name && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-sky-300">
                                    {member.role.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">{member.email}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-blue-600 dark:text-sky-400 font-bold text-xs">
                              {member.registration_id}
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {member.uid ? `UID: ${member.uid}` : 'UID: N/A'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">{member.department || 'N/A'}</div>
                            <div className="text-[11px] text-slate-500">{member.year || 'N/A'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedMemberForRole(member)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm ${
                                member.is_core_member
                                  ? 'bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/25'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                              title="Click to manage core responsibility or convert to normal user"
                            >
                              {member.is_core_member ? (
                                <>
                                  <Shield className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                                  <span>★ Core Member</span>
                                </>
                              ) : (
                                <span>Member</span>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors cursor-pointer inline-flex items-center justify-center"
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
              )
            )}
          </div>
        )}

        {/* Tab Content 3: Events Management */}
        {activeTab === 'events' && (
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-base font-bold">Club Events Management</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create, edit, or delete club events, upload event poster & PDF schedules, and manage registration windows.
                </p>
              </div>

              {/* Centre: Notice Board Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(true)}
                  className="px-3.5 py-1.5 sm:py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 text-xs font-black flex items-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer group shrink-0"
                  title="Manage Hanging Navbar Notice Board"
                >
                  <div className="relative">
                    <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:rotate-12 transition-transform" />
                    {activeNoticeCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <span>Notice Board</span>
                  {activeNoticeCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500 text-white leading-none">
                      Active
                    </span>
                  ) : null}
                </button>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                {/* Event Filters Pill Group: All, Upcoming, Completed */}
                <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
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
                        className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${isActive
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
                  className="w-full sm:w-auto justify-center"
                >
                  Create New Event
                </Button>
              </div>
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filtered.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between space-y-4 group"
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
                        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 items-start max-w-[calc(100%-80px)]">
                          {(() => {
                            const regActive = isRegistrationActive(evt);
                            const statusInfo = getEventStatusInfo(evt.date);
                            return (
                              <>
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md truncate max-w-full ${regActive
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-900/90 text-rose-300 border border-rose-500/30'
                                    }`}
                                >
                                  {regActive ? 'Registration Open' : 'Registration Closed'}
                                </span>

                                <div className="flex items-center gap-1 flex-wrap">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg border ${statusInfo.type === 'ongoing'
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
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight leading-snug flex-1">
                              {evt.title}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setBroadcastingEvent(evt)}
                              className="group/bcast shrink-0 h-7 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/15 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/20 text-xs font-bold transition-all duration-300 ease-out flex items-center cursor-pointer shadow-xs hover:shadow-sm"
                              title="Broadcast event announcement to all registered users via email"
                            >
                              <div className="flex items-center overflow-hidden">
                                <Radio className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover/bcast:scale-110" />
                                <span className="max-w-0 opacity-0 group-hover/bcast:max-w-[80px] group-hover/bcast:opacity-100 group-hover/bcast:ml-1.5 transition-all duration-300 ease-out whitespace-nowrap overflow-hidden text-[11px] font-black">
                                  Broadcast
                                </span>
                              </div>
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                            {evt.description || 'No description provided for this event.'}
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
                              <span>Registration Starts: {new Date(evt.registration_start).toLocaleDateString('en-GB')}</span>
                            </span>
                          )}
                          {evt.registration_enabled && evt.registration_end && (
                            <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Registration Ends: {new Date(evt.registration_end).toLocaleDateString('en-GB')}</span>
                            </span>
                          )}
                        </div>

                        {/* Date, Time, Venue & PDF View */}
                        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold truncate">
                              <span>📅 {evt.date ? new Date(evt.date).toLocaleDateString('en-GB') : 'TBD'}</span>
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

                          <div className="flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-end">
                            {(evt.registration_enabled || hasEventRegistrations(evt)) && (
                              <button
                                type="button"
                                onClick={() => setViewRegsEvent(evt)}
                                className="flex-1 sm:flex-none justify-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
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
          <div className="space-y-4 sm:space-y-6">
            {/* Header / Subtitle + Sync Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-sky-400" />
                  <span>Contact & Event Feedbacks</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage contact inquiries, general suggestions, and event-specific reviews.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncFeedbacks}
                disabled={isSyncingFeedbacks}
                className="w-full sm:w-auto h-10 px-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-sky-400 ${isSyncingFeedbacks ? 'animate-spin' : ''}`} />
                <span>{isSyncingFeedbacks ? 'Syncing...' : 'Sync Feedbacks'}</span>
              </button>
            </div>

            {/* 2 Interactive Overview & View Switcher Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Card 1: CONTACT FORM */}
              <button
                type="button"
                onClick={() => setFeedbackViewTab('contact')}
                className={`p-4 sm:p-5 rounded-3xl text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[120px] ${
                  feedbackViewTab === 'contact'
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    CONTACT FORM
                  </span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {contactFeedbacksList.length}
                  </span>
                  {contactFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length === 0 ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ All Handled
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ {contactFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length} Pending
                    </span>
                  )}
                </div>
              </button>

              {/* Card 2: EVENT FEEDBACK */}
              <button
                type="button"
                onClick={() => setFeedbackViewTab('event')}
                className={`p-4 sm:p-5 rounded-3xl text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[120px] ${
                  feedbackViewTab === 'event'
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    EVENT FEEDBACK
                  </span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {eventFeedbacksList.length}
                  </span>
                  {eventFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length === 0 ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ All Handled
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ {eventFeedbacksList.filter((f) => f.status === 'pending' || f.status === 'unread').length} Pending
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none -mx-1 px-1 max-w-full shrink-0">
                {(['all', 'pending', 'in_progress', 'resolved', 'archived'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFeedbackFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap cursor-pointer shrink-0 ${
                      feedbackFilter === st
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 flex-col sm:flex-row w-full lg:w-auto justify-end">
                {/* Event Dropdown filter when in Event Feedback view */}
                {feedbackViewTab === 'event' && (
                  <div className="w-full sm:w-56 shrink-0">
                    <CustomSelect
                      value={selectedFeedbackEvent}
                      onChange={(val) => setSelectedFeedbackEvent(val)}
                      options={[
                        { value: 'all', label: 'All Events' },
                        ...eventsList.map((e) => ({
                          value: e.id,
                          label: `${e.title}${e.status === 'cancelled' ? ' (Cancelled)' : ''}`,
                        })),
                      ]}
                      triggerClassName="w-full h-11 px-3.5 rounded-2xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer flex items-center justify-between transition-all shadow-sm"
                    />
                  </div>
                )}

                {/* Search Box */}
                <div className="relative w-full sm:flex-1 sm:w-60">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={feedbackViewTab === 'event' ? "Search sender, UID, Reg ID..." : "Search sender, email, query..."}
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    className="w-full pl-10 pr-4 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-xs border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={handleExportFeedbacksPdf}
                  className="w-full sm:w-auto h-11 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-500/50 dark:hover:border-red-500/50 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
                  title="Download filtered feedbacks as PDF"
                >
                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span>Download as PDF</span>
                </button>
              </div>
            </div>

            {/* Table Area */}
            {loadingFeedbacks ? (
              <div className="py-16 text-center text-xs text-slate-500">
                Loading feedbacks...
              </div>
            ) : (feedbackViewTab === 'event' ? filteredEventFeedbacks.length : filteredContactFeedbacks.length) === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No feedbacks found</p>
                <p className="text-slate-500">
                  {feedbackSearch || selectedFeedbackEvent !== 'all' || feedbackFilter !== 'all'
                    ? 'No submissions match your active search or filter.'
                    : feedbackViewTab === 'event'
                    ? 'There are no event-specific feedbacks submitted yet.'
                    : 'There are no contact form feedbacks to display.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[550px] rounded-2xl border border-slate-200/80 dark:border-slate-800 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 font-bold">#</th>
                      <th className="py-3.5 px-4 font-bold">
                        {feedbackViewTab === 'event' ? 'ATTENDEE DETAILS' : 'SENDER DETAILS'}
                      </th>
                      {feedbackViewTab === 'event' && (
                        <th className="py-3.5 px-4 font-bold">EVENT & RATINGS</th>
                      )}
                      <th className="py-3.5 px-4 font-bold">
                        {feedbackViewTab === 'event' ? 'DETAILED FEEDBACK' : 'SUBJECT'}
                      </th>
                      <th className="py-3.5 px-4 font-bold text-center">ACTION</th>
                      <th className="py-3.5 px-4 font-bold">SUBMISSION DATE</th>
                      <th className="py-3.5 px-4 text-right font-bold">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {(feedbackViewTab === 'event' ? filteredEventFeedbacks : filteredContactFeedbacks).map((f: any, idx) => (
                      <tr key={f.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 min-w-[230px]">
                          <div className="space-y-1.5">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{f.name}</div>
                            {feedbackViewTab === 'event' && (f.university_id || f.registration_id) ? (
                              <div className="flex items-center gap-1.5 flex-nowrap">
                                {f.university_id && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-sky-300 font-mono font-bold whitespace-nowrap border border-blue-200/60 dark:border-blue-500/20">
                                    UID: {f.university_id}
                                  </span>
                                )}
                                {f.registration_id && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold whitespace-nowrap border border-emerald-200/60 dark:border-emerald-500/20">
                                    Reg: {f.registration_id}
                                  </span>
                                )}
                              </div>
                            ) : null}
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={`mailto:${f.email}`}
                                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:underline font-mono truncate"
                              >
                                {f.email}
                              </a>
                              {f.phone && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  • 📞 {f.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {feedbackViewTab === 'event' && (
                          <td className="py-3.5 px-4 min-w-[200px]">
                            {(() => {
                              const matchedEvent = eventsList.find((e) => e.id === f.event_id);
                              const eventTitle = matchedEvent ? matchedEvent.title : (f.event_title || 'Event Feedback');
                              const isEventCancelled = matchedEvent?.status === 'cancelled';
                              return (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold ${
                                        isEventCancelled
                                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                          : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-sky-300'
                                      }`}
                                    >
                                      {eventTitle}
                                    </span>
                                    {isEventCancelled && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                        Cancelled
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                    {f.event_rating !== undefined && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                        ⭐ {f.event_rating}/5 Event
                                      </span>
                                    )}
                                    {f.coordination_rating && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                        🌿 {f.coordination_rating}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        <td className="py-3.5 px-4 min-w-[180px] max-w-[280px]">
                          {feedbackViewTab === 'event' ? (
                            <div className="line-clamp-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                              {f.message || 'No feedback remarks'}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[240px] inline-block"
                                title={f.subject || f.message || 'General Inquiry'}
                              >
                                {f.subject || (
                                  <span className="text-slate-400 font-normal italic">General Inquiry</span>
                                )}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingFeedback(f)}
                            className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-200/60 dark:border-blue-500/25 hover:bg-blue-100 dark:hover:bg-blue-500/25 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 mx-auto"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                          {f.created_at
                            ? `${new Date(f.created_at).toLocaleDateString('en-GB')} • ${new Date(f.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                            : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-block text-left">
                            <CustomSelect
                              value={
                                f.status === 'unread'
                                  ? 'pending'
                                  : f.status === 'responded'
                                    ? 'resolved'
                                    : f.status
                              }
                              onChange={(newVal) => {
                                const current =
                                  f.status === 'unread'
                                    ? 'pending'
                                    : f.status === 'responded'
                                      ? 'resolved'
                                      : f.status;
                                if (newVal !== current) {
                                  setPendingStatusFeedback({
                                    feedback: f,
                                    isEvent: feedbackViewTab === 'event',
                                    targetStatus: newVal as FeedbackStatus,
                                  });
                                }
                              }}
                              options={[
                                { value: 'pending', label: '⏳ Pending' },
                                { value: 'in_progress', label: '🔄 In Progress' },
                                { value: 'resolved', label: '✅ Resolved' },
                                { value: 'archived', label: '📁 Archived' },
                              ]}
                              triggerClassName={`min-w-[150px] sm:min-w-[155px] w-auto h-9 px-3.5 rounded-xl text-xs font-bold border flex items-center justify-between gap-2 transition-all cursor-pointer whitespace-nowrap ${
                                f.status === 'pending' || f.status === 'unread'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : f.status === 'in_progress'
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-sky-300 border-blue-500/30'
                                    : f.status === 'resolved' || f.status === 'responded'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                              }`}
                            />
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

        {/* Tab Content 5: Event Gallery Management */}
        {activeTab === 'gallery' && (
          <GalleryManagement events={eventsList} />
        )}

        {/* Tab Content 6: Our Team Management */}
        {activeTab === 'team' && (
          <TeamMediaManagement />
        )}

        {/* Tab Content 7: E-Mails Management */}
        {activeTab === 'emails' && (
          <EmailLogsManagement />
        )}

        {/* Create Event Modal */}
        <Modal isOpen={isCreateEventOpen} onClose={() => setIsCreateEventOpen(false)} title="Create New Event">
          <form onSubmit={handleCreateEventSubmit} className="space-y-4">
            {/* Event Title & Event Category Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Event Title <span className="text-red-500">*</span>
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
                  Event Category <span className="text-red-500">*</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            showAlert('Invalid File Format', 'Only image files (PNG, JPG, WEBP) are accepted.', 'warning');
                            return;
                          }
                          if (file.size > 1 * 1024 * 1024) {
                            showAlert(
                              'Image Size Limit Exceeded',
                              `Image size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 1 MB. Please compress or resize the poster.`,
                              'warning'
                            );
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
                        <span>Upload Poster (Max 1MB)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: EVENT PDF (DOCUMENT) */}
              <div className="min-w-0">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Event PDF (Max 2MB)</span>
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
                            showAlert('Invalid File Format', 'Only PDF files (.pdf) are accepted.', 'warning');
                            return;
                          }
                          if (file.size > 2 * 1024 * 1024) {
                            showAlert(
                              'PDF Size Limit Exceeded',
                              `PDF size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 2 MB. Please compress the PDF.`,
                              'warning'
                            );
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
              <DatePicker
                label="Event Date *"
                value={newEventData.date}
                onChange={(val) => {
                  const dayBefore = getDayBefore(val);
                  const shouldResetEnd = newEventData.registration_end && val && newEventData.registration_end >= val;
                  setNewEventData({
                    ...newEventData,
                    date: val,
                    registration_end: shouldResetEnd ? dayBefore : newEventData.registration_end,
                  });
                }}
                placeholder="Select date"
              />

              <TimePicker
                label="Event Time *"
                value={newEventData.time}
                onChange={(val) => setNewEventData({ ...newEventData, time: val })}
                placeholder="Select time"
              />
            </div>

            {/* Location & Rules Split 2-Column Row (50 / 50) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={newEventData.location}
                  onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                  placeholder="e.g. Chandigarh University"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Event Rules</span>
                  {newEventData.rules.trim() && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Configured
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRulesTarget('create');
                    setIsRulesModalOpen(true);
                  }}
                  className={`w-full h-11 px-3.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    newEventData.rules.trim()
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ScrollText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">
                    {newEventData.rules.trim() ? 'Edit Event Rules' : 'Configure Rules'}
                  </span>
                </button>
              </div>
            </div>

            {/* Registration & Team Configuration Section */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Registration & Team Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CustomCheckbox
                    checked={newEventData.registration_enabled}
                    onChange={(checked) => setNewEventData({ ...newEventData, registration_enabled: checked })}
                    label="Enable Registration"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CustomCheckbox
                    checked={newEventData.supports_teams}
                    onChange={(checked) => setNewEventData({ ...newEventData, supports_teams: checked, max_team_size: checked ? 4 : 1 })}
                    label="Allow Team Registrations"
                  />
                </div>
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
                      max={5}
                      value={newEventData.max_team_size}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 2;
                        if (val > 5) {
                          setTeamSizeWarning("Maximum team size cannot exceed 5.");
                          val = 5;
                        } else {
                          setTeamSizeWarning(null);
                        }
                        setNewEventData({ ...newEventData, max_team_size: val });
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {teamSizeWarning && (
                      <p className="mt-1 text-[10px] font-bold text-amber-500">{teamSizeWarning}</p>
                    )}
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
                      <DatePicker
                        label="Registration Start Window"
                        value={newEventData.registration_start}
                        onChange={(val) => setNewEventData({ ...newEventData, registration_start: val })}
                        placeholder="Select start date"
                        max={newEventData.registration_end || (newEventData.date ? getDayBefore(newEventData.date) : undefined)}
                      />
                    </div>

                    <div>
                      <DatePicker
                        label="Registration End / Deadline"
                        value={newEventData.registration_end}
                        onChange={(val) => setNewEventData({ ...newEventData, registration_end: val })}
                        placeholder="Select end date"
                        min={newEventData.registration_start || undefined}
                        max={newEventData.date ? getDayBefore(newEventData.date) : undefined}
                      />
                    </div>
                  </div>

                  {newEventData.registration_end && newEventData.date && newEventData.registration_end >= newEventData.date && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>Registration deadline cannot be on or after the event date ({newEventData.date}). Latest allowed deadline is {getDayBefore(newEventData.date)}.</span>
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
                  Event Title <span className="text-red-500">*</span>
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
                  Event Category <span className="text-red-500">*</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          showAlert('Invalid File Format', 'Only image files (PNG, JPG, WEBP) are accepted.', 'warning');
                          return;
                        }
                        if (file.size > 1 * 1024 * 1024) {
                          showAlert(
                            'Image Size Limit Exceeded',
                            `Image size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 1 MB. Please compress or resize the poster.`,
                            'warning'
                          );
                          return;
                        }
                        setEditPosterFile(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 group-hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 text-center transition-all space-y-0.5 h-12 flex flex-col justify-center items-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                        <span>Upload Poster (Max 1MB)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: EVENT PDF (DOCUMENT) */}
              <div className="min-w-0">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Event PDF (Max 2MB)</span>
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
                      title="Remove PDF"
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                          showAlert('Invalid File Format', 'Only PDF files (.pdf) are accepted.', 'warning');
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          showAlert(
                            'PDF Size Limit Exceeded',
                            `PDF size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 2 MB. Please compress the PDF.`,
                            'warning'
                          );
                          return;
                        }
                        setEditPdfFile(file);
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
                value={editEventData.description}
                onChange={(e) => setEditEventData({ ...editEventData, description: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePicker
                label="Event Date *"
                value={editEventData.date}
                onChange={(val) => {
                  const dayBefore = getDayBefore(val);
                  const shouldResetEnd = editEventData.registration_end && val && editEventData.registration_end >= val;
                  setEditEventData({
                    ...editEventData,
                    date: val,
                    registration_end: shouldResetEnd ? dayBefore : editEventData.registration_end,
                  });
                }}
                placeholder="Select date"
              />

              <TimePicker
                label="Event Time *"
                value={editEventData.time}
                onChange={(val) => setEditEventData({ ...editEventData, time: val })}
                placeholder="Select time"
              />
            </div>

            {/* Location & Rules Split 2-Column Row (50 / 50) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editEventData.location}
                  onChange={(e) => setEditEventData({ ...editEventData, location: e.target.value })}
                  placeholder="e.g. Chandigarh University"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Event Rules</span>
                  {editEventData.rules.trim() && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Configured
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRulesTarget('edit');
                    setIsRulesModalOpen(true);
                  }}
                  className={`w-full h-11 px-3.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    editEventData.rules.trim()
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ScrollText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">
                    {editEventData.rules.trim() ? 'Edit Event Rules' : 'Configure Rules'}
                  </span>
                </button>
              </div>
            </div>

            {/* Edit Registration & Team Configuration Section */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Registration & Team Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CustomCheckbox
                    checked={editEventData.registration_enabled}
                    onChange={(checked) => setEditEventData({ ...editEventData, registration_enabled: checked })}
                    label="Enable Registration"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CustomCheckbox
                    checked={editEventData.supports_teams}
                    onChange={(checked) => setEditEventData({ ...editEventData, supports_teams: checked, max_team_size: checked ? 4 : 1 })}
                    label="Allow Team Registrations"
                  />
                </div>
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
                      max={5}
                      value={editEventData.max_team_size}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 2;
                        if (val > 5) {
                          setTeamSizeWarning("Maximum team size cannot exceed 5.");
                          val = 5;
                        } else {
                          setTeamSizeWarning(null);
                        }
                        setEditEventData({ ...editEventData, max_team_size: val });
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {teamSizeWarning && (
                      <p className="mt-1 text-[10px] font-bold text-amber-500">{teamSizeWarning}</p>
                    )}
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
                      <DatePicker
                        label="Registration Start Window"
                        value={editEventData.registration_start}
                        onChange={(val) => setEditEventData({ ...editEventData, registration_start: val })}
                        placeholder="Select start date"
                        max={editEventData.registration_end || (editEventData.date ? getDayBefore(editEventData.date) : undefined)}
                      />
                    </div>

                    <div>
                      <DatePicker
                        label="Registration End / Deadline"
                        value={editEventData.registration_end}
                        onChange={(val) => setEditEventData({ ...editEventData, registration_end: val })}
                        placeholder="Select end date"
                        min={editEventData.registration_start || undefined}
                        max={editEventData.date ? getDayBefore(editEventData.date) : undefined}
                      />
                    </div>
                  </div>

                  {editEventData.registration_end && editEventData.date && editEventData.registration_end >= editEventData.date && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>Registration deadline cannot be on or after the event date ({editEventData.date}). Latest allowed deadline is {getDayBefore(editEventData.date)}.</span>
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

        {/* Roles CRUD Management Modal */}
        <RolesManagementModal
          isOpen={isRolesCrudModalOpen}
          onClose={() => setIsRolesCrudModalOpen(false)}
          members={membersList}
          onRolesUpdated={() => {
            loadAllMembers();
          }}
        />

        {/* Discrepancy Submissions Management Modal */}
        <DiscrepancyManagementModal
          isOpen={isDiscrepancyModalOpen}
          onClose={() => setIsDiscrepancyModalOpen(false)}
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

        {/* Global Themed Alert / Warning Modal */}
        <AlertModal
          isOpen={alertModalConfig.isOpen}
          onClose={() => setAlertModalConfig((prev) => ({ ...prev, isOpen: false }))}
          title={alertModalConfig.title}
          message={alertModalConfig.message}
          variant={alertModalConfig.variant}
        />

        {/* Event Rules & Guidelines Configuration Modal */}
        <EventRulesModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          eventTitle={
            activeRulesTarget === 'create'
              ? newEventData.title || 'New Event'
              : editEventData.title || 'Edit Event'
          }
          initialRules={
            activeRulesTarget === 'create'
              ? newEventData.rules
              : editEventData.rules
          }
          onSave={(savedRules) => {
            if (activeRulesTarget === 'create') {
              setNewEventData((prev) => ({ ...prev, rules: savedRules }));
            } else {
              setEditEventData((prev) => ({ ...prev, rules: savedRules }));
            }
          }}
        />

        {/* Reject Member Application with Reason Modal */}
        <RejectMemberModal
          isOpen={!!rejectingMember}
          member={rejectingMember}
          onClose={() => setRejectingMember(null)}
          onConfirmReject={handleConfirmReject}
        />

        {/* Broadcast Event Announcement Modal */}
        <BroadcastEventModal
          isOpen={!!broadcastingEvent}
          event={broadcastingEvent}
          onClose={() => setBroadcastingEvent(null)}
        />

        {/* Update Contact & Event Feedback Status Modal */}
        <UpdateFeedbackStatusModal
          isOpen={!!pendingStatusFeedback}
          feedback={pendingStatusFeedback?.feedback || null}
          isEvent={pendingStatusFeedback?.isEvent || false}
          targetStatus={pendingStatusFeedback?.targetStatus || 'pending'}
          onClose={() => setPendingStatusFeedback(null)}
          onConfirm={handleConfirmFeedbackStatusUpdate}
        />

        {/* Notice Board Management Modal */}
        <NoticeManagementModal
          isOpen={isNoticeModalOpen}
          onClose={() => setIsNoticeModalOpen(false)}
          onNoticeUpdated={checkActiveNotices}
        />

        {/* Full Inquiry / Message Details Modal */}
        {viewingFeedback && (
          <Modal
            isOpen={!!viewingFeedback}
            onClose={() => setViewingFeedback(null)}
            title={feedbackViewTab === 'event' ? 'Event Feedback Details' : 'Inquiry Message Details'}
            maxWidth="max-w-2xl"
            hideCloseButton={true}
          >
            <div className="space-y-4 text-xs">
              {/* Header Details Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Sender Name
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {viewingFeedback.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Status
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] mt-0.5 ${
                        viewingFeedback.status === 'resolved' || viewingFeedback.status === 'responded'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : viewingFeedback.status === 'in_progress'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-sky-300 border border-blue-500/30'
                            : viewingFeedback.status === 'archived'
                              ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {viewingFeedback.status === 'unread'
                        ? 'PENDING'
                        : viewingFeedback.status === 'responded'
                          ? 'RESOLVED'
                          : viewingFeedback.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Email Address
                    </span>
                    <a
                      href={`mailto:${viewingFeedback.email}`}
                      className="font-mono text-blue-600 dark:text-sky-400 hover:underline"
                    >
                      {viewingFeedback.email}
                    </a>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Submission Time
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {viewingFeedback.created_at
                        ? `${new Date(viewingFeedback.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${new Date(viewingFeedback.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Box */}
              {viewingFeedback.subject && (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 block mb-1">
                    Subject / Topic
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {viewingFeedback.subject}
                  </p>
                </div>
              )}

              {/* Full Message */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Full Message Content
                </span>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar whitespace-pre-wrap text-xs">
                  {viewingFeedback.message || 'No message provided.'}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewingFeedback(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={`mailto:${viewingFeedback.email}?subject=Re: ${encodeURIComponent(viewingFeedback.subject || 'Your Cloud Stack Club Inquiry')}`}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};
