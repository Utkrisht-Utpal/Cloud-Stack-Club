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
    const cleanPath = filePath.startsWith('http')
      ? filePath
      : `${R2_FOLDERS.REGISTRATION_FILES}/${filePath.replace(/^\/+/, '')}`;
    const url = resolveMediaUrl(cleanPath);
    setDocUrl(url);
    setLoading(false);
  }, [filePath, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`CUIMS Verification — ${applicantName}`}>
      <div className="space-y-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
            Loading document preview...
          </div>
        ) : docUrl ? (
          <div className="space-y-3">
            {isPdf ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden h-96">
                <iframe src={docUrl} className="w-full h-full" title="PDF Verification Preview" />
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center p-2 max-h-[450px]">
                <img
                  src={docUrl}
                  alt={`CUIMS Verification for ${applicantName}`}
                  className="max-h-[420px] w-auto object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Private verification document (deleted upon approval).
              </span>
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-sky-400 hover:bg-blue-200 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Original</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <FileText className="w-8 h-8 text-slate-400" />
            <span>No verification document URL available.</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
