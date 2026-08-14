import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Eye, 
  CheckCircle2, 
  Sparkles,
  Type,
  Hash,
  List,
  CheckSquare,
  AlignLeft,
  Link,
  Layers
} from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import { Modal } from '../ui/Modal';
import { getFormForEvent, saveFormForEvent, syncAllLocalFormsToSupabase } from '../../services/registrationForms';
import type { Event, EventFormField, FieldType } from '../../types/database';

interface EventFormBuilderProps {
  events: Event[];
  selectedEventId?: string;
  onEventSelect?: (eventId: string) => void;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Short Text Input', description: 'Single line text answer' },
  { value: 'textarea', label: 'Long Textarea', description: 'Multi-line detailed answer' },
  { value: 'select', label: 'Dropdown Select', description: 'Pick one option from a list' },
  { value: 'checkbox', label: 'Checkbox Toggle', description: 'Yes / No agreement checkbox' },
  { value: 'number', label: 'Number Input', description: 'Numeric values only' },
  { value: 'url', label: 'Web Link / URL', description: 'GitHub, LinkedIn, or Portfolio URL' },
];

export const EventFormBuilder: React.FC<EventFormBuilderProps> = ({
  events,
  selectedEventId: propSelectedEventId,
  onEventSelect,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    propSelectedEventId || (events[0]?.id || '')
  );
  const [fields, setFields] = useState<Partial<EventFormField>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Field Edit/Add Modal State
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldModalData, setFieldModalData] = useState<{
    label: string;
    field_type: FieldType;
    placeholder: string;
    help_text: string;
    options: string;
    required: boolean;
  }>({
    label: '',
    field_type: 'text',
    placeholder: '',
    help_text: '',
    options: '',
    required: false,
  });

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    syncAllLocalFormsToSupabase();
  }, []);

  useEffect(() => {
    if (propSelectedEventId) {
      setSelectedEventId(propSelectedEventId);
    }
  }, [propSelectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    loadFormFields(selectedEventId);
  }, [selectedEventId]);

  const loadFormFields = async (eventId: string) => {
    setLoading(true);
    try {
      const form = await getFormForEvent(eventId);
      if (form && form.fields && form.fields.length > 0) {
        setFields(form.fields);
        // Ensure form is synced to Supabase DB
        const selectedEvt = events.find((e) => e.id === eventId);
        const formTitle = selectedEvt ? `${selectedEvt.title} Registration Form` : 'Custom Registration Form';
        saveFormForEvent(eventId, form.fields, formTitle);
      } else {
        setFields([]);
      }
    } catch (err) {
      console.error('Error loading form fields:', err);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddField = () => {
    setEditingFieldIndex(null);
    setFieldModalData({
      label: '',
      field_type: 'text',
      placeholder: '',
      help_text: '',
      options: '',
      required: false,
    });
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (index: number) => {
    const field = fields[index];
    setEditingFieldIndex(index);

    let optionsStr = '';
    if (Array.isArray(field.options)) {
      optionsStr = field.options.join(', ');
    } else if (typeof field.options === 'string') {
      optionsStr = field.options;
    }

    setFieldModalData({
      label: field.label || '',
      field_type: (field.field_type as FieldType) || 'text',
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      options: optionsStr,
      required: field.required ?? false,
    });
    setIsFieldModalOpen(true);
  };

  const handleSaveFieldFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldModalData.label.trim()) return;

    let parsedOptions: string[] | null = null;
    if (fieldModalData.field_type === 'select' && fieldModalData.options.trim()) {
      parsedOptions = fieldModalData.options
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean);
    }

    const newFieldObj: Partial<EventFormField> = {
      label: fieldModalData.label.trim(),
      field_key: fieldModalData.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      field_type: fieldModalData.field_type,
      placeholder: fieldModalData.placeholder.trim() || null,
      help_text: fieldModalData.help_text.trim() || null,
      options: parsedOptions,
      required: fieldModalData.required,
    };

    if (editingFieldIndex !== null) {
      // Update existing field
      setFields((prev) =>
        prev.map((item, idx) => (idx === editingFieldIndex ? { ...item, ...newFieldObj } : item))
      );
    } else {
      // Add new field
      setFields((prev) => [...prev, newFieldObj]);
    }

    setIsFieldModalOpen(false);
  };

  const handleDeleteField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    setFields(newFields);
  };

  const handleSaveForm = async () => {
    if (!selectedEventId) return;

    const selectedEvt = events.find((e) => e.id === selectedEventId);
    const formTitle = selectedEvt ? `${selectedEvt.title} Registration Form` : 'Custom Registration Form';

    try {
      await saveFormForEvent(selectedEventId, fields, formTitle);
      setSaveSuccess(`Successfully saved ${fields.length} dynamic form field(s) for event!`);
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error saving form:', err);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'textarea': return <AlignLeft className="w-4 h-4 text-purple-500" />;
      case 'select': return <List className="w-4 h-4 text-emerald-500" />;
      case 'checkbox': return <CheckSquare className="w-4 h-4 text-amber-500" />;
      case 'number': return <Hash className="w-4 h-4 text-indigo-500" />;
      case 'url': return <Link className="w-4 h-4 text-sky-500" />;
      case 'text':
      default:
        return <Type className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bottom Floating Toast Notification (Disappears after 2 seconds) */}
      <AnimatePresence>
        {saveSuccess && (
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
            <span className="text-xs sm:text-sm font-bold leading-snug">{saveSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls: Event Selector Dropdown & Actions */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-sky-400" />
              <span>Event Registration Form Builder</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize dynamic questions for student event registration forms. Select an event below to configure custom questions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              disabled={fields.length === 0}
              className="h-10 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Form</span>
            </button>

            <button
              type="button"
              onClick={handleSaveForm}
              className="h-10 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Form Configuration</span>
            </button>
          </div>
        </div>

        {/* Event Selection Dropdown */}
        <div className="pt-2 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Target Event:
            </label>
          </div>
          <div className="md:col-span-9">
            <CustomSelect
              value={selectedEventId}
              onChange={(val) => {
                setSelectedEventId(val);
                if (onEventSelect) onEventSelect(val);
              }}
              options={events.map((e) => ({
                value: e.id,
                label: `${e.title} (${e.date ? new Date(e.date).toLocaleDateString() : 'Upcoming'})`,
              }))}
              triggerClassName="w-full h-11 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer flex items-center justify-between text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Custom Form Fields ({fields.length})
            </span>
            {fields.length > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Active Custom Override
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                Standard Questions Only
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenAddField}
            className="px-4 py-2 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-sky-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Question</span>
          </button>
        </div>

        {/* Standard Always-Collected Student Info Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/50 space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Standard Collected Information (Default for all events)</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {['Full Name', 'Student Email', 'Phone Number', 'University UID', 'Department', 'Academic Year'].map((item) => (
              <span key={item} className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Custom Questions List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading custom form configuration...</div>
        ) : fields.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Custom Questions Added</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Students registering for "{selectedEvent?.title || 'this event'}" will fill standard contact details. Click "Add Custom Question" to ask specific questions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddField}
              className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Question</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id || index}
                className="p-4.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between gap-4 group hover:border-blue-500/50 transition-all"
              >
                {/* Field Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                    {getFieldTypeIcon(field.field_type as FieldType)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {index + 1}. {field.label}
                      </span>
                      {field.required ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/15 text-red-600 dark:text-red-400">
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-500">
                          Optional
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-sky-400 font-mono">
                        {field.field_type}
                      </span>
                    </div>

                    {field.help_text && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {field.help_text}
                      </p>
                    )}

                    {field.field_type === 'select' && field.options && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="font-semibold">Options:</span>
                        <span>{Array.isArray(field.options) ? field.options.join(' • ') : String(field.options)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Field Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveField(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveField(index, 'down')}
                    disabled={index === fields.length - 1}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditField(index)}
                    className="p-1.5 rounded-xl hover:bg-blue-500/10 text-blue-600 dark:text-sky-400 transition-all cursor-pointer"
                    title="Edit Field"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteField(index)}
                    className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                    title="Delete Field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Add / Edit Question Modal */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        title={editingFieldIndex !== null ? 'Edit Custom Question' : 'Add Custom Question'}
      >
        <form onSubmit={handleSaveFieldFromModal} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Question Label / Prompt *
            </label>
            <input
              type="text"
              required
              value={fieldModalData.label}
              onChange={(e) => setFieldModalData({ ...fieldModalData, label: e.target.value })}
              placeholder="e.g. GitHub Profile / Portfolio Link"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Input Type *
              </label>
              <CustomSelect
                value={fieldModalData.field_type}
                onChange={(val) => setFieldModalData({ ...fieldModalData, field_type: val as FieldType })}
                options={FIELD_TYPE_OPTIONS}
                triggerClassName="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Required Field?
              </label>
              <label className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldModalData.required}
                  onChange={(e) => setFieldModalData({ ...fieldModalData, required: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {fieldModalData.required ? 'Yes (Mandatory)' : 'No (Optional)'}
                </span>
              </label>
            </div>
          </div>

          {fieldModalData.field_type === 'select' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Options List (Comma-separated) *
              </label>
              <input
                type="text"
                required
                value={fieldModalData.options}
                onChange={(e) => setFieldModalData({ ...fieldModalData, options: e.target.value })}
                placeholder="e.g. Small, Medium, Large, Extra Large"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Placeholder Hint
            </label>
            <input
              type="text"
              value={fieldModalData.placeholder}
              onChange={(e) => setFieldModalData({ ...fieldModalData, placeholder: e.target.value })}
              placeholder="e.g. https://github.com/username"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Help Text / Instructions
            </label>
            <input
              type="text"
              value={fieldModalData.help_text}
              onChange={(e) => setFieldModalData({ ...fieldModalData, help_text: e.target.value })}
              placeholder="e.g. Make sure repository is public"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setIsFieldModalOpen(false)}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg"
            >
              {editingFieldIndex !== null ? 'Update Question' : 'Add Question'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Live Student Form Preview */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Form Preview — ${selectedEvent?.title || 'Event'}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500 shrink-0" />
            <span>This is how the custom questions will render to students during registration.</span>
          </div>

          {fields.map((f, idx) => (
            <div key={idx} className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>

              {f.field_type === 'textarea' ? (
                <textarea
                  rows={2}
                  disabled
                  placeholder={f.placeholder || ''}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700"
                />
              ) : f.field_type === 'select' ? (
                <select
                  disabled
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700"
                >
                  <option>Select an option...</option>
                  {Array.isArray(f.options) &&
                    f.options.map((opt, i) => <option key={i}>{opt}</option>)}
                </select>
              ) : f.field_type === 'checkbox' ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" disabled className="w-4 h-4 rounded text-blue-600" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">{f.help_text || 'Agree'}</span>
                </label>
              ) : (
                <input
                  type={f.field_type === 'number' ? 'number' : 'text'}
                  disabled
                  placeholder={f.placeholder || ''}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700"
                />
              )}

              {f.help_text && f.field_type !== 'checkbox' && (
                <p className="text-[10px] text-slate-400">{f.help_text}</p>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
