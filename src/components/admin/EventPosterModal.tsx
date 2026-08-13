import React from 'react';
import { Image as ImageIcon, Download, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface EventPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  eventTitle: string;
}

export const EventPosterModal: React.FC<EventPosterModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  eventTitle,
}) => {
  if (!imageUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Event Poster — ${eventTitle}`}>
      <div className="space-y-4">
        {/* Full Resolution Poster Container */}
        <div className="w-full max-h-[70vh] rounded-2xl overflow-hidden bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 relative">
          <img
            src={imageUrl}
            alt={`Poster for ${eventTitle}`}
            className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold truncate">
            <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate">{eventTitle} — Official Poster</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Full Image</span>
            </a>
            <a
              href={imageUrl}
              download={`${eventTitle.replace(/[^a-z0-9]/gi, '_')}_poster.png`}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};
