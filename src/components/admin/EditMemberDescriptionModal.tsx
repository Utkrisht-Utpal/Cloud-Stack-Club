import React, { useState, useEffect } from 'react';
import { FileText, Check, AlertCircle, Sparkles, Edit3, Quote } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface EditMemberDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  memberRole?: string | null;
  initialDescription?: string | null;
  initialMode?: 'view' | 'edit';
  onSave: (newDescription: string) => Promise<void>;
}

export const EditMemberDescriptionModal: React.FC<EditMemberDescriptionModalProps> = ({
  isOpen,
  onClose,
  memberName,
  memberRole,
  initialDescription,
  initialMode = 'view',
  onSave,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDescription(initialDescription || '');
    setMode(initialMode);
    setError(null);
  }, [initialDescription, initialMode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await onSave(description.trim());
      setMode('view');
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
      title={mode === 'edit' ? `Edit Bio — ${memberName}` : `Member Bio — ${memberName}`}
      maxWidth="max-w-2xl sm:max-w-3xl"
    >
      <div className="space-y-4">
        {/* Member Meta Banner */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-sky-400 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-sky-400" />
            <span className="font-bold">
              {memberName} {memberRole ? `• ${memberRole}` : ''}
            </span>
          </div>

          {mode === 'view' && (
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Bio</span>
            </button>
          )}
        </div>

        {mode === 'view' ? (
          /* View Mode */
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative">
              <Quote className="w-6 h-6 text-slate-300 dark:text-slate-700 absolute top-3 right-3 pointer-events-none opacity-60" />
              {description ? (
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar pr-2">
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-normal">
                    {description}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  No bio description has been written for this member yet. Click "Edit Bio" above to add one.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
              >
                Close
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setMode('edit')}
                icon={<Edit3 className="w-4 h-4" />}
              >
                Edit Description
              </Button>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="memberDescriptionInput"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                  <span>Bio Description</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  {description.length} / 1000 chars
                </span>
              </div>

              <textarea
                id="memberDescriptionInput"
                rows={8}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a brief professional bio, focus areas, or contributions of this core team member (up to 1000 characters)..."
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs sm:text-sm border border-slate-200 dark:border-slate-700/80 leading-relaxed custom-scrollbar resize-y min-h-[160px] max-h-[380px]"
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

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setMode('view')}
                disabled={isSaving}
              >
                Back to View
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSaving}
                icon={<Check className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : 'Save Description'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
