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
  AlertCircle, 
  Plus, 
  Trash2, 
  ArrowRight
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CustomSelect } from '../ui/CustomSelect';
import { getFormForEvent } from '../../services/registrationForms';
import { registerForEvent } from '../../services/registrations';
import { formatEventTime } from '../../utils/formatters';
import type { Event, EventFormField, EventRegistration } from '../../types/database';

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
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; uid: string }>>([]);

  // Dynamic Custom Questions State
  const [customFields, setCustomFields] = useState<EventFormField[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  // Status & Confirmation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<EventRegistration | null>(null);

  useEffect(() => {
    if (isOpen && event) {
      // Reset form state on mount
      setFormData({
        name: '',
        email: '',
        phone: '',
        uid: '',
        department: '',
        year: '1st Year',
      });
      setIsTeamRegistration(false);
      setTeamName('');
      setTeamMembers([]);
      setCustomAnswers({});
      setError(null);
      setRegistrationResult(null);

      // Load custom form questions for this event
      getFormForEvent(event.id).then((form) => {
        if (form && form.fields && form.fields.length > 0) {
          setCustomFields(form.fields);
        } else {
          setCustomFields([]);
        }
      });
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const handleAddTeamMember = () => {
    const maxMembers = (event.max_team_size || 4) - 1;
    if (teamMembers.length >= maxMembers) return;
    setTeamMembers((prev) => [...prev, { name: '', email: '', uid: '' }]);
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateTeamMember = (index: number, key: 'name' | 'email' | 'uid', value: string) => {
    setTeamMembers((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, [key]: value } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.uid.trim()) {
      setError('Please fill in Name, Email (@example.com), and University ID (UID) for the team leader.');
      return;
    }

    if (formData.phone.trim() && !/^\d{10}$/.test(formData.phone.trim())) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    if (isTeamRegistration) {
      if (!teamName.trim()) {
        setError('Please enter a Team Name.');
        return;
      }
      for (let i = 0; i < teamMembers.length; i++) {
        const m = teamMembers[i];
        if (!m.name.trim() || !m.email.trim() || !m.uid.trim()) {
          setError(`Please fill in Name, Email (@example.com), and University ID (UID) for Teammate #${i + 2}.`);
          return;
        }
      }
    }

    // Check required custom questions
    for (const field of customFields) {
      if (field.required) {
        const ans = customAnswers[field.field_key];
        if (!ans || (typeof ans === 'string' && !ans.trim())) {
          setError(`Please answer the required question: "${field.label}"`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build custom answers payload
      const formattedAnswers = Object.keys(customAnswers).map((key) => {
        const targetField = customFields.find((f) => f.field_key === key);
        return {
          field_id: targetField?.id || key,
          answer_text: String(customAnswers[key] || ''),
        };
      });

      const result = await registerForEvent({
        event_id: event.id,
        registrant_name: formData.name.trim(),
        registrant_email: formData.email.trim(),
        registrant_phone: formData.phone.trim() || undefined,
        uid: formData.uid.trim(),
        team_name: isTeamRegistration ? teamName.trim() : undefined,
        team_members: isTeamRegistration ? teamMembers.filter((m) => m.name.trim()) : undefined,
        answers: formattedAnswers,
      });

      setRegistrationResult(result);
      if (onSuccessToast) onSuccessToast();
    } catch (err: any) {
      console.error('Event registration error:', err);
      setError(err?.message || 'Failed to submit registration. Please try again.');
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
      title={registrationResult ? 'Registration Successful 🎉' : `Event Registration — ${event.title}`}
    >
      {registrationResult ? (
        /* Success Ticket Confirmation Screen */
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              You're Registered for {event.title}!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your registration has been confirmed. Please save your official registration pass below.
            </p>
          </div>

          {/* Ticket Pass Box */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3 text-left max-w-md mx-auto shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <span className="text-[10px] font-black uppercase text-slate-400">Registration Pass</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Confirmed
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Registration ID</div>
              <div className="text-lg font-mono font-black text-blue-600 dark:text-sky-400">
                {registrationResult.registration_number || `REG-${Date.now().toString().slice(-6)}`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <div className="text-[10px] font-bold text-slate-400">Registrant Name</div>
                <div className="font-bold text-slate-900 dark:text-white truncate">{formData.name}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400">University ID (UID)</div>
                <div className="font-bold text-slate-900 dark:text-white truncate">{formData.uid}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <div className="text-[10px] font-bold text-slate-400">Date</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{formattedDate}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400">Venue</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{event.location || 'CU Campus'}</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-lg cursor-pointer"
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

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Standard Student Information */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" />
              <span>Student Registrant Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-medium border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Student Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="@example.com"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-medium border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  University ID (UID) *
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.uid}
                    onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                    placeholder="University ID (UID)"
                    className="w-full pl-9 pr-3.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-medium border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
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
                      Team Name *
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
                    <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Team Member {idx + 2} *
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Member Name *"
                          value={m.name}
                          onChange={(e) => handleUpdateTeamMember(idx, 'name', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700"
                        />
                        <input
                          type="email"
                          required
                          placeholder="@example.com *"
                          value={m.email}
                          onChange={(e) => handleUpdateTeamMember(idx, 'email', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          required
                          placeholder="University ID (UID) *"
                          value={m.uid}
                          onChange={(e) => handleUpdateTeamMember(idx, 'uid', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700"
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

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting Registration...</span>
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
