import React, { useState, useEffect } from 'react';
import { FileText, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface EditMemberDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  memberRole?: string | null;
  initialDescription?: string | null;
  onSave: (newDescription: string) => Promise<void>;
}

export const EditMemberDescriptionModal: React.FC<EditMemberDescriptionModalProps> = ({
  isOpen,
  onClose,
  memberName,
  memberRole,
  initialDescription,
  onSave,
}) => {
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDescription(initialDescription || '');
    setError(null);
  }, [initialDescription, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await onSave(description.trim());
      onClose();
    } catch (err: any) {
      console.error('Error saving member description:', err);
      setError(err?.message || 'Failed to save description. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Description — ${memberName}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member Meta Info Banner */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-sky-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-sky-400" />
          <span>
            {memberName} {memberRole ? `• ${memberRole}` : ''}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="memberDescriptionInput"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              <span>Member Bio &amp; Description</span>
            </label>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              {description.length} / 500 chars
            </span>
          </div>

          <textarea
            id="memberDescriptionInput"
            rows={5}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a brief professional bio, focus areas, or contributions of this core team member..."
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs sm:text-sm border border-slate-200 dark:border-slate-700/80 leading-relaxed resize-none"
          />

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
            This bio is displayed on the public website inside the <strong>Meet Our Team</strong> section card when visitors hover or view member details.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving}
            icon={<Check className="w-4 h-4" />}
          >
            {isSaving ? 'Saving Bio...' : 'Save Description'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
