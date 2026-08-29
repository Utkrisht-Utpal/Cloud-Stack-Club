import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { resolveMediaUrl, R2_FOLDERS } from '../../lib/r2Storage';

interface VerificationDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string | null;
  applicantName: string;
}

export const VerificationDocModal: React.FC<VerificationDocModalProps> = ({
  isOpen,
  onClose,
  filePath,
  applicantName,
}) => {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filePath || !isOpen) {
      setDocUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const isPdfFile = filePath.toLowerCase().includes('.pdf');
    setIsPdf(isPdfFile);

    // Resolve R2 public URL for the verification document
    const cleanPath = (filePath.startsWith('http') || filePath.startsWith(R2_FOLDERS.REGISTRATION_FILES))
      ? filePath
      : `${R2_FOLDERS.REGISTRATION_FILES}/${filePath.replace(/^\/+/, '')}`;
    const url = resolveMediaUrl(cleanPath);
    setDocUrl(url);
    setLoading(false);
  }, [filePath, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`CUIMS Verification — ${applicantName}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-slate-500 text-sm">
            Loading document preview...
          </div>
        ) : docUrl ? (
          <div className="space-y-4">
            {isPdf ? (
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden h-[650px] shadow-inner bg-slate-950">
                <iframe src={docUrl} className="w-full h-full" title="PDF Verification Preview" />
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-3 min-h-[400px] max-h-[70vh] shadow-inner">
                <img
                  src={docUrl}
                  alt={`CUIMS Verification for ${applicantName}`}
                  className="max-h-[66vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                🔒 Private student verification document (auto-deleted upon admin approval).
              </span>
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Full Original</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <FileText className="w-10 h-10 text-slate-400" />
            <span>No verification document URL available.</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
