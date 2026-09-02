import React, { useState, useEffect } from 'react';
import { ScrollText, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface EventRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
  initialRules?: string;
  onSave: (rules: string) => void;
}

const MAX_RULES_LENGTH = 5000;

export const EventRulesModal: React.FC<EventRulesModalProps> = ({
  isOpen,
  onClose,
  eventTitle = 'Event',
  initialRules = '',
  onSave,
}) => {
  const [rulesText, setRulesText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRulesText(initialRules || '');
      setError(null);
    }
  }, [isOpen, initialRules]);

  const handleSave = () => {
    if (rulesText.length > MAX_RULES_LENGTH) {
      setError(`Rules text exceeds maximum limit of ${MAX_RULES_LENGTH.toLocaleString()} characters.`);
      return;
    }
    onSave(rulesText.trim());
    onClose();
  };

  const handleInsertBullet = () => {
    setRulesText((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return '• ';
      return `${trimmed}\n• `;
    });
  };

  const remainingChars = MAX_RULES_LENGTH - rulesText.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Event Rules & Guidelines — ${eventTitle || 'New Event'}`}
    >
      <div className="space-y-4">
        {/* Header Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5">
          <ScrollText className="w-5 h-5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-blue-900 dark:text-blue-200">
              Configure Event Participation Rules
            </p>
            <p className="text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
              Define the eligibility guidelines, event schedule flow, judging criteria, code of conduct, and submission specifications for participants.
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleInsertBullet}
            className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>+ Add Bullet Point</span>
          </button>

          <span
            className={`text-xs font-semibold ${
              remainingChars < 200 ? 'text-amber-500' : 'text-slate-400'
            }`}
          >
            {rulesText.length.toLocaleString()} / {MAX_RULES_LENGTH.toLocaleString()} characters
          </span>
        </div>

        {/* Rules Textarea */}
        <div className="relative">
          <textarea
            rows={12}
            value={rulesText}
            onChange={(e) => {
              if (e.target.value.length <= MAX_RULES_LENGTH) {
                setRulesText(e.target.value);
                if (error) setError(null);
              }
            }}
            placeholder={`Example guidelines:\n\n• Eligibility: Open to all 1st-4th year undergraduate students.\n• Team Size: 1 to 4 members per team.\n• Code of Conduct: Any form of plagiarism will lead to immediate disqualification.\n• Submission: Projects must be submitted before the deadline on GitHub.`}
            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm leading-relaxed border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y min-h-[220px]"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5 text-white" />
            <span>Save Rules</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
