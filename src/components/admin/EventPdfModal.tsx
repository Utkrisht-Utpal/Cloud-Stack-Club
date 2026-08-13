import React from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getEventPdfViewerUrl } from '../../services/events';

interface EventPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  eventTitle: string;
}

export const EventPdfModal: React.FC<EventPdfModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  eventTitle,
}) => {
  if (!pdfUrl) return null;

  const resolvedUrl = getEventPdfViewerUrl(pdfUrl);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Event Document — ${eventTitle}`}>
      <div className="space-y-4">
        {/* PDF Preview Frame */}
        <div className="w-full h-[65vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 relative">
          <iframe
            src={resolvedUrl}
            title={`Event Document for ${eventTitle}`}
            className="w-full h-full border-none"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold truncate">
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate">{eventTitle} — Official PDF</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab</span>
            </a>
            <a
              href={resolvedUrl}
              download={`${eventTitle.replace(/[^a-z0-9]/gi, '_')}_document.pdf`}
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
