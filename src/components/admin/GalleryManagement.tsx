import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowUpDown,
  FileImage,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  getGalleryPhotos,
  uploadGalleryPhotos,
  updateGalleryPhoto,
  deleteGalleryPhoto,
} from '../../services/gallery';
import type { Event, GalleryPhoto } from '../../types/database';

interface GalleryManagementProps {
  events: Event[];
}

export const GalleryManagement: React.FC<GalleryManagementProps> = ({ events }) => {
  const [photosList, setPhotosList] = useState<GalleryPhoto[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Upload State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Edit Caption State
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [editOrderNum, setEditOrderNum] = useState<number>(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Preview State
  const [previewPhoto, setPreviewPhoto] = useState<GalleryPhoto | null>(null);

  // Delete State
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Alerts
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    setRefreshing(true);
    try {
      const data = await getGalleryPhotos();
      setPhotosList(data);
    } catch (err: any) {
      console.error('Failed to load gallery photos:', err);
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to fetch gallery photos.' });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPhotos();
  }, []);

  // Default to the first event if none selected
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Filter photos for selected event (or all if selectedEventId === 'all')
  const visiblePhotos = selectedEventId === 'all'
    ? photosList
    : photosList.filter((p) => p.event_id === selectedEventId);

  // Photo counts per event
  const getEventPhotoCount = (eventId: string) => {
    return photosList.filter((p) => p.event_id === eventId).length;
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter((f) =>
        f.type.startsWith('image/')
      );
      setUploadFiles(validFiles);
    }
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      setUploadFiles(validFiles);
    }
  };

  const handleStartUpload = () => {
    if (!selectedEventId || selectedEventId === 'all') {
      if (events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    }
    setUploadFiles([]);
    setUploadCaption('');
    setUploadProgress(null);
    setIsUploadModalOpen(true);
  };

  const executeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || selectedEventId === 'all') {
      setStatusMsg({ type: 'error', text: 'Please choose an event to upload photos to.' });
      return;
    }

    if (uploadFiles.length === 0) {
      setStatusMsg({ type: 'error', text: 'Please select at least one photo to upload.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: uploadFiles.length });

    try {
      const created = await uploadGalleryPhotos(
        selectedEventId,
        uploadFiles,
        uploadCaption,
        (current, total) => setUploadProgress({ current, total })
      );

      setPhotosList((prev) => [...created, ...prev]);
      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setUploadCaption('');
      setStatusMsg({
        type: 'success',
        text: `Successfully uploaded ${created.length} photo(s) to Cloudflare R2!`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to upload photos to Cloudflare R2.',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleStartEdit = (photo: GalleryPhoto) => {
    setEditingPhoto(photo);
    setEditCaptionText(photo.caption || '');
    setEditOrderNum(photo.display_order ?? 0);
  };

  const executeUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    setIsSavingEdit(true);
    try {
      const updated = await updateGalleryPhoto(editingPhoto.id, {
        caption: editCaptionText,
        display_order: Number(editOrderNum) || 0,
      });

      setPhotosList((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setEditingPhoto(null);
      setStatusMsg({ type: 'success', text: 'Photo updated successfully.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to update photo.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const executeDeletePhoto = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGalleryPhoto(photoToDelete.id, photoToDelete.image_url);
      setPhotosList((prev) => prev.filter((p) => p.id !== photoToDelete.id));
      setPhotoToDelete(null);
      setStatusMsg({ type: 'success', text: 'Photo deleted from database and Cloudflare R2.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to delete photo.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Event Gallery Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an event to upload, manage, and showcase high-resolution event moments stored directly in Cloudflare R2.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={fetchPhotos}
            disabled={refreshing}
            className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Event Selector & Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch lg:h-[418px]">
        {/* Left: Event Selection List */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0 h-full">
          <div className="flex items-center justify-between px-1 pb-3 shrink-0 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Select Event</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              {events.length} Events
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1.5 pt-3 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Option to show all photos */}
            <button
              type="button"
              onClick={() => setSelectedEventId('all')}
              className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                selectedEventId === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">All Events</p>
                <p className={`text-[11px] truncate mt-0.5 ${selectedEventId === 'all' ? 'text-blue-100' : 'text-slate-400'}`}>
                  View full club photo catalog
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                  selectedEventId === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {photosList.length}
              </span>
            </button>

            {events.map((evt) => {
              const count = getEventPhotoCount(evt.id);
              const isSelected = selectedEventId === evt.id;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{evt.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {evt.date && (
                        <span className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {evt.category && (
                        <span className={`text-[10px] truncate uppercase font-semibold ${isSelected ? 'text-blue-200' : 'text-sky-500'}`}>
                          • {evt.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : count > 0
                        ? 'bg-blue-500/15 text-blue-600 dark:text-sky-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Event Info & Gallery Grid */}
        <div className="lg:col-span-2 flex flex-col min-h-0 h-full space-y-4">
          {/* Selected Event Details Header */}
          <div className="shrink-0">
            {selectedEvent && selectedEventId !== 'all' ? (
              <div className="p-5 rounded-3xl bg-blue-50/70 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-700 dark:text-sky-400">
                      {selectedEvent.category || 'Event'}
                    </span>
                    {selectedEvent.date && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(selectedEvent.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedEvent.title}
                  </h3>
                  {selectedEvent.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xl font-medium">
                      {selectedEvent.description}
                    </p>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleStartUpload}
                  className="shrink-0"
                >
                  Add Photos
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Displaying all {photosList.length} photos across all events
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  onClick={handleStartUpload}
                >
                  Upload New
                </Button>
              </div>
            )}
          </div>

          {/* Photo Gallery Scrollable Container Card */}
          <div className="flex-1 min-h-0 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-xs font-semibold">Loading gallery photos...</span>
              </div>
            ) : visiblePhotos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 px-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                  <FileImage className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    No photos uploaded for this event yet
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Click the button below to upload high-resolution images to Cloudflare R2 storage.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={handleStartUpload}
                >
                  Upload Event Photos
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pb-2">
                  {visiblePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm aspect-square flex flex-col justify-end"
                    >
                      <img
                        src={photo.image_url}
                        alt={photo.caption || 'Event photo'}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Gradient Overlay & Actions on Hover */}
                      <div className="relative z-10 p-2.5 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(photo)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-all cursor-pointer"
                          title="Preview Full Image"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(photo)}
                            className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white transition-all cursor-pointer"
                            title="Edit Caption / Order"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPhotoToDelete(photo)}
                            className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-all cursor-pointer"
                            title="Delete from R2 and Database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Caption badge if present */}
                      {photo.caption && (
                        <div className="absolute top-2 left-2 right-2 z-10">
                          <span className="px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-md text-[10px] font-medium text-white truncate block">
                            {photo.caption}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Photos Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !isUploading && setIsUploadModalOpen(false)}
        title="Upload Event Photos to Cloudflare R2"
        maxWidth="max-w-xl"
      >
        <form onSubmit={executeUpload} className="space-y-4">
          {/* Target Event Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Event <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedEventId === 'all' ? (events[0]?.id || '') : selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={isUploading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.date || 'No Date'})
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropFiles}
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-900/60 transition-all cursor-pointer text-center space-y-2 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFilesSelected}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drag and drop photos here
              </p>
              <p className="text-[11px] text-slate-400">
                Supports PNG, JPG, JPEG, WEBP (Multiple selection enabled)
              </p>
            </div>
          </div>

          {/* Selected Files Count Preview */}
          {uploadFiles.length > 0 && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-sky-400 flex items-center justify-between">
              <span>{uploadFiles.length} photo(s) selected for upload</span>
              <button
                type="button"
                onClick={() => setUploadFiles([])}
                className="text-[11px] text-red-500 hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Optional Caption */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Default Caption / Tag (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Keynote Presentation, Team Coding Session, Award Ceremony"
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              disabled={isUploading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && uploadProgress && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Uploading to Cloudflare R2...</span>
                <span>{uploadProgress.current} of {uploadProgress.total}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-300"
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUploading || uploadFiles.length === 0}
              icon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            >
              {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Photo Caption / Order Modal */}
      <Modal
        isOpen={!!editingPhoto}
        onClose={() => setEditingPhoto(null)}
        title="Edit Photo Details"
        maxWidth="max-w-md"
      >
        <form onSubmit={executeUpdatePhoto} className="space-y-4">
          {editingPhoto && (
            <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <img
                src={editingPhoto.image_url}
                alt="Editing"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Photo Caption
            </label>
            <input
              type="text"
              placeholder="Enter caption..."
              value={editCaptionText}
              onChange={(e) => setEditCaptionText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Display Order Rank</span>
            </label>
            <input
              type="number"
              min="0"
              value={editOrderNum}
              onChange={(e) => setEditOrderNum(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingPhoto(null)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingEdit}
              icon={isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Full Preview Modal */}
      <Modal
        isOpen={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        title={previewPhoto?.caption || 'Photo Preview'}
        maxWidth="max-w-3xl"
      >
        {previewPhoto && (
          <div className="space-y-3">
            <div className="max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950">
              <img
                src={previewPhoto.image_url}
                alt={previewPhoto.caption || 'Preview'}
                className="max-h-[68vh] object-contain"
              />
            </div>
            {previewPhoto.caption && (
              <p className="text-xs font-semibold text-center text-slate-700 dark:text-slate-300">
                {previewPhoto.caption}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!photoToDelete}
        onClose={() => setPhotoToDelete(null)}
        onConfirm={executeDeletePhoto}
        title="Delete Photo from Gallery?"
        message="Are you sure you want to delete this photo? It will be permanently removed from the Supabase database and deleted from your Cloudflare R2 bucket."
        confirmText="Delete Photo"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
