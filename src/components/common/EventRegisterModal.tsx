import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Building2, 
  Users2, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ArrowRight,
  Ticket,
  Info,
  ExternalLink
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CustomSelect } from '../ui/CustomSelect';
import { ErrorPopupModal } from './ErrorPopupModal';
import { TurnstileWidget, resetTurnstile } from './TurnstileWidget';
import { useSubmitCooldown } from '../../hooks/useSubmitCooldown';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getFormForEvent, getEventRegistrationCountsMap } from '../../services/registrationForms';
import { registerForEvent } from '../../services/registrations';
import { getStoredWhatsappUrlsMap, saveStoredWhatsappUrl } from '../../services/events';
import { sendIndividualRegistrationEmail, sendTeamRegistrationEmails } from '../../services/email';
import { formatEventTime } from '../../utils/formatters';
import type { Event, EventFormField, EventRegistration } from '../../types/database';

// WhatsApp brand icon (inline SVG — Lucide does not include WhatsApp)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.528 5.855L.057 23.177a.75.75 0 0 0 .916.932l5.453-1.428A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.714 9.714 0 0 1-4.951-1.355l-.355-.212-3.679.964.982-3.584-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

interface EventRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onSuccessToast?: () => void;
}

const YEAR_OPTIONS = [
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
];

export const EventRegisterModal: React.FC<EventRegisterModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccessToast,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    uid: '',
    department: '',
    year: '1st Year',
  });

  // Team Registration State
  const [isTeamRegistration, setIsTeamRegistration] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<
    Array<{
      name: string;
      email: string;
      uid: string;
      phone: string;
      department: string;
      year: string;
    }>
  >([]);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const { cooldown, isCoolingDown, startCooldown, resetCooldown } = useSubmitCooldown(9);

  // Dynamic custom form fields
  const [customFields, setCustomFields] = useState<EventFormField[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  // Status & Confirmation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<EventRegistration | null>(null);
  const [isCapacityFull, setIsCapacityFull] = useState<boolean>(false);
  const [liveWhatsappUrl, setLiveWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && event) {
      setRegistrationResult(null);
      setError(null);
      resetCooldown();
      setIsCapacityFull(false);
      setLiveWhatsappUrl(event.whatsapp_url || null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        uid: '',
        department: '',
        year: '1st Year',
      });
      setTeamName('');
      setTeamMembers([{ name: '', email: '', uid: '', phone: '', department: '', year: '1st Year' }]);
      setCustomAnswers({});
      setTurnstileToken('');

      // Direct live lookup of whatsapp_url from DB if not already populated on event prop
      if (!event.whatsapp_url && isSupabaseConfigured()) {
        (async () => {
          try {
            const { data: wData } = await supabase
              .from('events')
              .select('whatsapp_url')
              .eq('id', event.id)
              .maybeSingle();
            if (wData?.whatsapp_url) {
              setLiveWhatsappUrl(wData.whatsapp_url);
              saveStoredWhatsappUrl(event.id, wData.whatsapp_url, event.slug);
            }
          } catch {}
        })();
      }

      // Check current capacity
      if (event.max_registrations) {
        getEventRegistrationCountsMap()
          .then((counts) => {
            const current =
              counts[event.id] ??
              counts[event.id.toLowerCase()] ??
              (event.slug ? counts[event.slug.toLowerCase()] : undefined) ??
              0;
            if (current >= event.max_registrations!) {
              setIsCapacityFull(true);
            }
          })
          .catch(() => {});
      }

      // Fetch dynamic custom form fields if configured for this event
      const loadEventForm = async () => {
        try {
          const formConfig = await getFormForEvent(event.id);
          if (formConfig && formConfig.fields) {
            setCustomFields(formConfig.fields);
          } else {
            setCustomFields([]);
          }
        } catch (err) {
          console.warn('Failed to load custom event form fields:', err);
          setCustomFields([]);
        }
      };

      loadEventForm();
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const whatsappMap = getStoredWhatsappUrlsMap();
  const eventWhatsappUrl =
    liveWhatsappUrl ||
    event.whatsapp_url ||
    whatsappMap[event.id] ||
    (event.slug ? whatsappMap[event.slug.toLowerCase()] : null) ||
    null;

  const triggerErrorWithCooldown = (msg: string) => {
    setError(msg);
    setTurnstileToken('');
    resetTurnstile();
    startCooldown(9);
  };

  const handleAddTeamMember = () => {
    const maxMembers = (event.max_team_size || 4) - 1;
    if (teamMembers.length >= maxMembers) return;
    setTeamMembers((prev) => [
      ...prev,
      { name: '', email: '', uid: '', phone: '', department: '', year: '1st Year' },
    ]);
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateTeamMember = (
    index: number,
    key: 'name' | 'email' | 'uid' | 'phone' | 'department' | 'year',
    value: string
  ) => {
    setTeamMembers((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, [key]: value } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCoolingDown || isSubmitting) return;
    setError(null);

    // Guard against race conditions where capacity was filled while modal was open
    if (event.max_registrations) {
      try {
        const counts = await getEventRegistrationCountsMap();
        const current =
          counts[event.id] ??
          counts[event.id.toLowerCase()] ??
          (event.slug ? counts[event.slug.toLowerCase()] : undefined) ??
          0;
        if (current >= event.max_registrations) {
          setIsCapacityFull(true);
          triggerErrorWithCooldown('Registration for this event has reached full capacity.');
          return;
        }
      } catch (err) {}
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.uid.trim()) {
      triggerErrorWithCooldown(
        isTeamRegistration
          ? 'Please fill in Name, Email (@example.com), and University ID (UID) for the team leader.'
          : 'Please fill in Name, Email (@example.com), and University ID (UID).'
      );
      return;
    }

    if (formData.uid.trim().length !== 10) {
      triggerErrorWithCooldown(
        isTeamRegistration
          ? 'University ID (UID) for the team leader must be exactly 10 alphanumeric characters.'
          : 'University ID (UID) must be exactly 10 alphanumeric characters.'
      );
      return;
    }

    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone.trim())) {
      triggerErrorWithCooldown('Phone number is required and must be exactly 10 digits.');
      return;
    }

    if (isTeamRegistration) {
      if (!teamName.trim()) {
        triggerErrorWithCooldown('Please enter a Team Name.');
        return;
      }

      const leaderUid = formData.uid.trim().toUpperCase();
      const leaderEmail = formData.email.trim().toLowerCase();
      const leaderPhone = formData.phone.trim().replace(/\D/g, '').slice(-10);

      const seenUids = new Set([leaderUid]);
      const seenEmails = new Set([leaderEmail]);
      const seenPhones = new Set([leaderPhone]);

      for (let i = 0; i < teamMembers.length; i++) {
        const m = teamMembers[i];
        if (!m.name.trim() || !m.email.trim() || !m.uid.trim() || !m.phone.trim() || !m.department.trim()) {
          triggerErrorWithCooldown(`Please fill in Name, Email, UID, Phone Number, and Department for Teammate #${i + 2}.`);
          return;
        }
        if (m.uid.trim().length !== 10) {
          triggerErrorWithCooldown(`University ID (UID) for Teammate #${i + 2} must be exactly 10 alphanumeric characters.`);
          return;
        }
        if (!/^\d{10}$/.test(m.phone.trim().replace(/\D/g, '').slice(-10))) {
          triggerErrorWithCooldown(`Phone number for Teammate #${i + 2} must be exactly 10 digits.`);
          return;
        }

        const tmUid = m.uid.trim().toUpperCase();
        const tmEmail = m.email.trim().toLowerCase();
        const tmPhone = m.phone.trim().replace(/\D/g, '').slice(-10);

        if (tmUid === leaderUid) {
          triggerErrorWithCooldown(`Teammate #${i + 2} ${m.name.trim()} cannot have the same University ID as the team leader.`);
          return;
        }
        if (tmEmail === leaderEmail) {
          triggerErrorWithCooldown(`Teammate #${i + 2} ${m.name.trim()} cannot have the same Email ID as the team leader.`);
          return;
        }
        if (tmPhone === leaderPhone) {
          triggerErrorWithCooldown(`Teammate #${i + 2} ${m.name.trim()} cannot have the same Phone number as the team leader.`);
          return;
        }

        if (seenUids.has(tmUid)) {
          triggerErrorWithCooldown(`Duplicate University ID ${tmUid} entered for Teammate #${i + 2}.`);
          return;
        }
        if (seenEmails.has(tmEmail)) {
          triggerErrorWithCooldown(`Duplicate Email ID ${tmEmail} entered for Teammate #${i + 2}.`);
          return;
        }
        if (seenPhones.has(tmPhone)) {
          triggerErrorWithCooldown(`Duplicate Phone number ${tmPhone} entered for Teammate #${i + 2}.`);
          return;
        }

        seenUids.add(tmUid);
        seenEmails.add(tmEmail);
        seenPhones.add(tmPhone);
      }
    }

    // Check required custom questions
    for (const field of customFields) {
      const ans = customAnswers[field.field_key || field.id];
      if (field.required) {
        if (!ans || (typeof ans === 'string' && !ans.trim()) || (Array.isArray(ans) && ans.length === 0)) {
          triggerErrorWithCooldown(`Please answer the required question: "${field.label}"`);
          return;
        }
      }
    }

    if (!turnstileToken) {
      triggerErrorWithCooldown('Please complete the Turnstile anti-bot security check.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build custom answers payload
      const formattedAnswers = Object.keys(customAnswers).map((key) => {
        const targetField = customFields.find((f) => f.field_key === key || f.id === key);
        return {
          field_id: targetField?.id || key,
          answer_text: String(customAnswers[key] || ''),
        };
      });

      const result = await registerForEvent(
        {
          event_id: event.id,
          registrant_name: formData.name.trim(),
          registrant_email: formData.email.trim(),
          registrant_phone: formData.phone.trim() || undefined,
          uid: formData.uid.trim(),
          team_name: isTeamRegistration ? teamName.trim() : undefined,
          team_members:
            isTeamRegistration && teamMembers.length > 0
              ? teamMembers
                  .filter((m) => m.name.trim() && m.email.trim())
                  .map((m) => ({
                    name: m.name.trim(),
                    email: m.email.trim(),
                    uid: m.uid ? m.uid.trim().toUpperCase() : undefined,
                    phone: m.phone ? m.phone.trim() : undefined,
                    department: m.department.trim(),
                    year: m.year || '1st Year',
                  }))
              : undefined,
          answers: formattedAnswers,
        },
        turnstileToken.trim()
      );

      setRegistrationResult(result);
      resetCooldown();
      if (onSuccessToast) onSuccessToast();

      // Trigger background automated confirmation emails
      try {
        if (isTeamRegistration) {
          sendTeamRegistrationEmails({
            event_title: event.title,
            event_date: event.date || '',
            event_time: event.start_time || undefined,
            event_venue: event.location || undefined,
            whatsapp_url: eventWhatsappUrl || undefined,
            team_name: teamName.trim(),
            team_registration_number: result?.team?.registration_number || result?.registration_number || undefined,
            leader: {
              name: formData.name.trim(),
              email: formData.email.trim(),
              uid: formData.uid.trim(),
              department: formData.department.trim(),
              year: formData.year,
              phone: formData.phone.trim(),
              registration_number: result?.registration_number || undefined,
            },
            members: (teamMembers || [])
              .filter((m) => m && m.name && m.name.trim() && m.email && m.email.trim())
              .map((m, idx) => {
                const cleanEmail = m.email.trim().toLowerCase();
                const cleanUid = m.uid ? m.uid.trim().toUpperCase() : '';
                const cleanName = m.name.trim().toLowerCase();

                const found = result?.team?.members?.find((dbM: any) => {
                  const mEmail = dbM.email ? String(dbM.email).trim().toLowerCase() : '';
                  const mUid = dbM.uid ? String(dbM.uid).trim().toUpperCase() : '';
                  const mName = dbM.name ? String(dbM.name).trim().toLowerCase() : '';
                  if (cleanEmail && mEmail && cleanEmail === mEmail) return true;
                  if (cleanUid && mUid && cleanUid === mUid) return true;
                  if (cleanName && mName && cleanName === mName) return true;
                  return false;
                });

                return {
                  name: m.name.trim(),
                  email: m.email.trim(),
                  uid: m.uid ? m.uid.trim() : null,
                  phone: m.phone ? m.phone.trim() : null,
                  department: (m.department || found?.department || '').trim(),
                  year: (m.year || found?.year || '1st Year').trim(),
                  registration_number: found?.registration_number || result?.team?.members?.[idx]?.registration_number || undefined,
                };
              }),
            registration_number: result?.team?.registration_number || result?.registration_number,
          }).then((res) => {
            console.log('Automated team registration emails successfully sent:', res);
          }).catch((emailErr) => {
            console.error('Background team registration email dispatch notice:', emailErr);
          });
        } else {
          sendIndividualRegistrationEmail({
            name: formData.name.trim(),
            email: formData.email.trim(),
            uid: formData.uid.trim(),
            phone: formData.phone.trim(),
            department: formData.department.trim(),
            year: formData.year,
            event_title: event.title,
            event_date: event.date || '',
            event_time: event.start_time || undefined,
            event_venue: event.location || undefined,
            whatsapp_url: eventWhatsappUrl || undefined,
            registration_number: result?.registration_number,
          }).catch((emailErr) => console.warn('Background individual registration email dispatch notice:', emailErr));
        }
      } catch (emailDispatchErr) {
        console.warn('Non-blocking registration email trigger note:', emailDispatchErr);
      }
    } catch (err: any) {
      console.error('Event registration error:', err);
      triggerErrorWithCooldown(err?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isCapacityFull
          ? `Registration Full — ${event.title}`
          : registrationResult
          ? 'Registration Successful 🎉'
          : `Event Registration — ${event.title}`
      }
    >
      {isCapacityFull ? (
        /* Capacity Reached Screen */
        <div className="space-y-6 text-center py-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30 shadow-inner">
            <Ticket className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Registration Full • Capacity Reached
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Registration for <span className="font-bold text-slate-900 dark:text-white">{event.title}</span> has reached its maximum capacity of {event.max_registrations} seats. No further registrations are being accepted.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      ) : registrationResult ? (
        /* Success Ticket Confirmation Screen - Compact Viewport Fitted */
        <div className="space-y-3.5 text-center py-1 max-w-md mx-auto">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                You're Registered for {event.title}!
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Your registration is confirmed. Please save your official pass below.
            </p>
          </div>

          {/* Ticket Pass Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-left shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {registrationResult.team ? `Team Pass • ${registrationResult.team.team_name}` : 'Registration Pass'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Confirmed
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {registrationResult.team ? 'Team Registration ID' : 'Registration Pass ID'}
              </div>
              <div className="text-lg font-mono font-black text-blue-600 dark:text-sky-400">
                {registrationResult.team
                  ? (registrationResult.team.registration_number || 'REG-CONFIRMED')
                  : (registrationResult.registration_number || 'REG-CONFIRMED')}
              </div>
            </div>

            {/* Date and Venue */}
            <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-200/80 dark:border-slate-700/80">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Date</div>
                <div className="text-xs font-bold tracking-wide text-slate-900 dark:text-white truncate">
                  {formattedDate}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Venue</div>
                <div className="text-xs font-bold tracking-wide text-slate-900 dark:text-white truncate">
                  {event.location || 'Revealing Soon'}
                </div>
              </div>
            </div>

            {/* Individual Registrant Details */}
            {!registrationResult.team && (
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Registrant Name</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{formData.name}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">University ID (UID)</div>
                  <div className="text-xs font-bold font-mono text-slate-900 dark:text-white truncate">{formData.uid}</div>
                </div>
              </div>
            )}

            {/* Team Passes Section */}
            {registrationResult.team && (
              <div className="pt-1.5 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Users2 className="w-3 h-3 text-indigo-500" />
                  <span>Team Passes ({(registrationResult.team.members?.length || 0) + 1} Members)</span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {/* 1. Team Leader Pass */}
                  <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-slate-900/90 border border-indigo-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold tracking-wide uppercase text-indigo-600 dark:text-indigo-400 truncate">
                        Leader: {formData.name}
                      </div>
                      {formData.uid && (
                        <div className="text-[9px] font-mono tracking-wider text-slate-600 dark:text-slate-300 truncate">
                          UID: <span className="font-semibold">{formData.uid}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 pl-1.5">
                      <div className="text-[8px] font-bold tracking-wider uppercase text-slate-400">Pass ID</div>
                      <div className="text-[11px] font-mono font-bold tracking-wider text-indigo-600 dark:text-sky-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-slate-700">
                        {registrationResult.registration_number || 'REG-CONFIRMED'}
                      </div>
                    </div>
                  </div>

                  {/* 2. Teammate Passes */}
                  {registrationResult.team.members &&
                    registrationResult.team.members.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-2 rounded-xl bg-indigo-50/70 dark:bg-slate-900/90 border border-indigo-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold tracking-wide uppercase text-indigo-600 dark:text-indigo-400 truncate">
                            Teammate #{mIdx + 2}: {m.name}
                          </div>
                          {m.uid && (
                            <div className="text-[9px] font-mono tracking-wider text-slate-600 dark:text-slate-300 truncate">
                              UID: <span className="font-semibold">{m.uid}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 pl-1.5">
                          <div className="text-[8px] font-bold tracking-wider uppercase text-slate-400">Pass ID</div>
                          <div className="text-[11px] font-mono font-bold tracking-wider text-indigo-600 dark:text-sky-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-slate-700">
                            {m.registration_number || 'REG-CONFIRMED'}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Note Callout & Official WhatsApp Action Link */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left space-y-2.5 shadow-sm">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                <span className="font-bold text-amber-600 dark:text-amber-400">Note:</span> Check your registered mail inbox and also the junk file and mark it not as junk.
              </p>
            </div>

            {eventWhatsappUrl && (
              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <WhatsAppIcon className="w-3 h-3 shrink-0 text-emerald-500" />
                  <span>Official Event WhatsApp Group</span>
                </div>
                <a
                  href={eventWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Join Event WhatsApp Group</span>
                  </div>
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        /* Event Registration Form */
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Event Summary Header Card */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                {event.category || 'Event'}
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {event.title}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>{formattedDate}</span>
              </span>
              {event.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>{formatEventTime(event.start_time)}</span>
                </span>
              )}
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>{event.location || 'CU Campus'}</span>
              </span>
            </div>
          </div>

          {/* Top Centered Error Popup Modal */}
          <ErrorPopupModal
            isOpen={!!error}
            message={error}
            onClose={() => setError(null)}
          />

          {/* Section 1: Standard Student Information */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" />
              <span>Student Registrant Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Rahul Sharma"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-medium border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rahul@example.com"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-medium border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  University ID (UID) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.uid}
                    onChange={(e) => setFormData({ ...formData, uid: e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase() })}
                    placeholder="University ID (UID)"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-mono font-bold uppercase border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit Phone Number"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-medium border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Branch
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. CSE / IT"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-medium border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Year
                </label>
                <CustomSelect
                  value={formData.year}
                  onChange={(val) => setFormData({ ...formData, year: val })}
                  options={YEAR_OPTIONS}
                  triggerClassName="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Team Registration (If Supported) */}
          {event.supports_teams && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/60 border border-indigo-200/60 dark:border-slate-700/60 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTeamRegistration}
                  onChange={(e) => setIsTeamRegistration(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users2 className="w-4 h-4 text-indigo-500" />
                  <span>Register as a Team (Max {event.max_team_size || 4} members)</span>
                </span>
              </label>

              {isTeamRegistration && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Team Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={isTeamRegistration}
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Cyber Squad"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {teamMembers.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          Team Member {idx + 2} <span className="text-red-500">*</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(idx)}
                          className="w-7 h-7 rounded-lg bg-red-500/15 dark:bg-red-500/20 border border-red-500/30 dark:border-red-500/40 text-red-600 dark:text-red-400 shadow-[0_2px_8px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_14px_rgba(239,68,68,0.35)] hover:bg-red-500/25 hover:border-red-500/50 hover:scale-110 active:scale-95 transition-all duration-200 inline-flex items-center justify-center cursor-pointer"
                          title="Remove teammate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Row 1: Name and Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Member Name *"
                          value={m.name}
                          onChange={(e) => handleUpdateTeamMember(idx, 'name', e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                        <input
                          type="email"
                          required
                          placeholder="Email Address (@example.com) *"
                          value={m.email}
                          onChange={(e) => handleUpdateTeamMember(idx, 'email', e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>

                      {/* Row 2: UID and Phone Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          maxLength={10}
                          placeholder="University UID *"
                          value={m.uid}
                          onChange={(e) => handleUpdateTeamMember(idx, 'uid', e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase())}
                          className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 text-xs font-mono font-bold uppercase border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                        <input
                          type="tel"
                          required
                          pattern="[0-9]{10}"
                          maxLength={10}
                          placeholder="10-digit Phone Number *"
                          value={m.phone}
                          onChange={(e) => handleUpdateTeamMember(idx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>

                      {/* Row 3: Department and Academic Year */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Department / Branch *"
                          value={m.department}
                          onChange={(e) => handleUpdateTeamMember(idx, 'department', e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                        <CustomSelect
                          value={m.year || '1st Year'}
                          onChange={(val) => handleUpdateTeamMember(idx, 'year', val)}
                          options={YEAR_OPTIONS}
                          triggerClassName="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}

                  {teamMembers.length < ((event.max_team_size || 4) - 1) && (
                    <button
                      type="button"
                      onClick={handleAddTeamMember}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Teammate</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Dynamic Custom Event Questions */}
          {customFields.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800/60 border border-blue-200/60 dark:border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Event Specific Questions</span>
              </div>

              {customFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.field_type === 'textarea' ? (
                    <textarea
                      rows={2}
                      required={field.required}
                      value={customAnswers[field.field_key] || ''}
                      onChange={(e) => setCustomAnswers({ ...customAnswers, [field.field_key]: e.target.value })}
                      placeholder={field.placeholder || ''}
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  ) : field.field_type === 'select' ? (
                    <select
                      required={field.required}
                      value={customAnswers[field.field_key] || ''}
                      onChange={(e) => setCustomAnswers({ ...customAnswers, [field.field_key]: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">Select an option...</option>
                      {Array.isArray(field.options) &&
                        field.options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                  ) : field.field_type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!customAnswers[field.field_key]}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, [field.field_key]: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {field.help_text || 'Agree / Confirm'}
                      </span>
                    </label>
                  ) : field.field_type === 'phone' ? (
                    <input
                      type="tel"
                      required={field.required}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={customAnswers[field.field_key] || ''}
                      onChange={(e) => setCustomAnswers({ ...customAnswers, [field.field_key]: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder={field.placeholder || '10-digit Phone Number'}
                      className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  ) : (
                    <input
                      type={field.field_type === 'number' ? 'number' : 'text'}
                      required={field.required}
                      value={customAnswers[field.field_key] || ''}
                      onChange={(e) => setCustomAnswers({ ...customAnswers, [field.field_key]: e.target.value })}
                      placeholder={field.placeholder || ''}
                      className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  )}

                  {field.help_text && field.field_type !== 'checkbox' && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{field.help_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Cloudflare Turnstile */}
          <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isCoolingDown}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Registration...</span>
                </>
              ) : isCoolingDown ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  <span>Submit in {cooldown}s</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
