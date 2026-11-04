import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Upload,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileImage,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Toast } from '../ui/Toast';
import {
  getCertificates,
  uploadCertificates,
  reorderCertificates,
  deleteCertificate,
  MAX_CERTIFICATE_SIZE,
} from '../../services/certificates';
import type { Certificate } from '../../types/database';

export const CertificatesManagement: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Upload State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Delete State
  const [certToDelete, setCertToDelete] = useState<Certificate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Alerts
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCertificatesData = async () => {
    try {
      const data = await getCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load certificates.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCertificatesData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCertificatesData();
  };

  // Trigger file selection dialog
  const handleOpenFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Validate and handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles: File[] = [];
    const rejectedErrors: string[] = [];

    for (const file of selectedFiles) {
      const isJpg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
      if (!isJpg) {
        rejectedErrors.push(`"${file.name}" is not a JPG image.`);
        continue;
      }

      if (file.size > MAX_CERTIFICATE_SIZE) {
        const sizeKB = (file.size / 1024).toFixed(0);
        rejectedErrors.push(`"${file.name}" exceeds 500KB (${sizeKB}KB).`);
        continue;
      }

      validFiles.push(file);
    }

    if (rejectedErrors.length > 0) {
      setStatusMsg({
        type: 'error',
        text: `Some files could not be added: ${rejectedErrors.join(' ')} (Max 500KB JPG only)`,
      });
    }

    if (validFiles.length > 0) {
      setUploadFiles(validFiles);
      setIsUploadModalOpen(true);
    }
  };

  // Perform multi-file upload
  const handleConfirmUpload = async () => {
    if (uploadFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress({ current: 0, total: uploadFiles.length });

    try {
      const created = await uploadCertificates(uploadFiles, (completed, total) => {
        setUploadProgress({ current: completed, total });
      });

      setCertificates((prev) => [...prev, ...created]);
      setStatusMsg({
        type: 'success',
        text: `Successfully uploaded ${created.length} certificate${created.length > 1 ? 's' : ''}!`,
      });
      setIsUploadModalOpen(false);
      setUploadFiles([]);
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to upload certificates. Please try again.',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Remove file from staging before upload
  const handleRemoveStagedFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadFiles.length <= 1) {
      setIsUploadModalOpen(false);
    }
  };

  // Atomic reorder: Swap certificate position with adjacent item
  const handleSwapOrder = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= certificates.length) return;

    const updated = [...certificates];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Update display orders sequentially
    const reordered = updated.map((item, idx) => ({
      ...item,
      display_order: idx + 1,
    }));

    setCertificates(reordered);
    const success = await reorderCertificates(reordered);
    if (!success) {
      setStatusMsg({ type: 'error', text: 'Failed to save new order in database.' });
    }
  };

  // Delete certificate
  const handleConfirmDelete = async () => {
    if (!certToDelete) return;
    setIsDeleting(true);

    try {
      await deleteCertificate(certToDelete.id, certToDelete.image_url);
      setCertificates((prev) => prev.filter((c) => c.id !== certToDelete.id));
      setStatusMsg({ type: 'success', text: 'Certificate removed successfully.' });
    } catch (err: any) {
      console.error('Delete error:', err);
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to delete certificate.' });
    } finally {
      setIsDeleting(false);
      setCertToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for JPG Certificates */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,image/jpeg"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Management Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Certificates Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                {certificates.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Upload, reorder, and showcase club member certificates. (JPG only, max 500KB each)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="text-xs"
          >
            Sync
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={handleOpenFileInput}
            className="shadow-md shadow-blue-500/20"
          >
            Upload Certificates
          </Button>
        </div>
      </div>

      {/* Main Certificates Grid View */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[380px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold">Loading certificates...</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <FileImage className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                No certificates uploaded yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Upload member certificates in JPG format (up to 500KB each). They will be showcased to the public in the exact order arranged here.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
              onClick={handleOpenFileInput}
              className="mt-2"
            >
              Upload Certificates
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Helper tip banner */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-medium">
              <span>Showing {certificates.length} certificate{certificates.length > 1 ? 's' : ''}</span>
              <span>Use ◀ and ▶ arrows to reorder display sequence</span>
            </div>

            {/* Grid of Certificates */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {certificates.map((cert, index) => {
                const isFirst = index === 0;
                const isLast = index === certificates.length - 1;

                return (
                  <div
                    key={cert.id}
                    className="group relative rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Position Sequence Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-900/80 text-white backdrop-blur-md shadow-xs">
                      #{index + 1}
                    </div>

                    {/* Image Preview Container */}
                    <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900/80 flex items-center justify-center overflow-hidden">
                      <img
                        src={cert.image_url}
                        alt={`Certificate #${index + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback placeholder on image load error
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75" viewBox="0 0 100 75"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="10">Image</text></svg>';
                        }}
                      />
                    </div>

                    {/* Action Bar: Reorder & Delete */}
                    <div className="p-2.5 flex items-center justify-between gap-1 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 mt-auto">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSwapOrder(index, 'left')}
                          disabled={isFirst}
                          title={isFirst ? 'Already at start' : 'Move left'}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isFirst
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-sky-400'
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSwapOrder(index, 'right')}
                          disabled={isLast}
                          title={isLast ? 'Already at end' : 'Move right'}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isLast
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-sky-400'
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCertToDelete(cert)}
                        title="Delete certificate"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload Staging Modal */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => !isUploading && setIsUploadModalOpen(false)}
          title={`Upload ${uploadFiles.length} Certificate${uploadFiles.length > 1 ? 's' : ''}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-700 dark:text-sky-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                All selected files are verified JPGs under 500KB. Click <strong>Start Upload</strong> to save them to Cloudflare R2 and publish to the public page.
              </span>
            </div>

            {/* Selected Files List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 [scrollbar-width:none]">
              {uploadFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileImage className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>

                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStagedFile(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Progress Bar */}
            {isUploading && uploadProgress && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Uploading certificates...</span>
                  <span>
                    {uploadProgress.current} / {uploadProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{
                      width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                onClick={handleConfirmUpload}
                disabled={isUploading || uploadFiles.length === 0}
              >
                {isUploading ? 'Uploading...' : `Start Upload (${uploadFiles.length})`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {certToDelete && (
        <ConfirmModal
          isOpen={!!certToDelete}
          onClose={() => !isDeleting && setCertToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Certificate?"
          message="Are you sure you want to permanently delete this certificate? It will be removed from Cloudflare R2 storage and the public showcase."
          confirmText={isDeleting ? 'Deleting...' : 'Delete Certificate'}
          variant="danger"
        />
      )}

      {/* Status Notifications */}
      <Toast
        isVisible={!!statusMsg}
        message={statusMsg?.text || ''}
        type={statusMsg?.type || 'success'}
        onClose={() => setStatusMsg(null)}
      />
    </div>
  );
};
