import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  Edit2,
  Loader2,
  Check,
  RefreshCw,
  Eye,
  FileImage,
  Layers,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { CustomSelect, type SelectOption } from '../ui/CustomSelect';
import {
  getGalleryPhotos,
  uploadGalleryPhotos,
  updateGalleryPhoto,
  deleteGalleryPhoto,
  MAX_GALLERY_PHOTO_SIZE,
} from '../../services/gallery';
import type { Event, GalleryPhoto } from '../../types/database';

// Format YYYY-MM-DD or ISO string to DD-MM-YYYY
const formatToDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

// Find the event that just passed (most recent past event)
const getMostRecentPassedEventId = (evts: Event[]): string => {
  if (!evts || evts.length === 0) return '';
  const todayStr = new Date().toISOString().split('T')[0];
  const pastEvents = evts
    .filter((e) => e.date && e.date <= todayStr)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (pastEvents.length > 0) {
    return pastEvents[0].id;
  }
  return evts[0].id;
};

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
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Preview State
  const [previewPhoto, setPreviewPhoto] = useState<GalleryPhoto | null>(null);
  const [previewLocalPhoto, setPreviewLocalPhoto] = useState<{ url: string; name: string } | null>(null);

  // Delete State
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Alerts
  const [, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local object URLs for selected files
  const uploadFilePreviews = useMemo(() => {
    return uploadFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [uploadFiles]);

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

  // Default to the event that just passed (most recent past event)
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      const defaultId = getMostRecentPassedEventId(events);
      setSelectedEventId(defaultId);
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Memoized options for CustomSelect dropdown
  const eventSelectOptions: SelectOption[] = useMemo(() => {
    return events.map((evt) => ({
      value: evt.id,
      label: evt.date ? `${evt.title} (${formatToDDMMYYYY(evt.date)})` : evt.title,
      description: evt.category || undefined,
    }));
  }, [events]);

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
      const imageFiles = Array.from(e.target.files).filter((f) =>
        f.type.startsWith('image/')
      );
      const accepted = imageFiles.filter((f) => f.size <= MAX_GALLERY_PHOTO_SIZE);
      const oversized = imageFiles.filter((f) => f.size > MAX_GALLERY_PHOTO_SIZE);

      if (oversized.length > 0) {
        setStatusMsg({
          type: 'error',
          text: `${oversized.length} photo(s) exceeded the 1MB limit and were skipped. Only photos under 1MB are allowed.`,
        });
      }

      if (accepted.length > 0) {
        setUploadFiles((prev) => {
          const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
          const newUnique = accepted.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
          return [...prev, ...newUnique];
        });
      }
      // Clear input so selecting more files or re-selecting works immediately
      e.target.value = '';
    }
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      const accepted = imageFiles.filter((f) => f.size <= MAX_GALLERY_PHOTO_SIZE);
      const oversized = imageFiles.filter((f) => f.size > MAX_GALLERY_PHOTO_SIZE);

      if (oversized.length > 0) {
        setStatusMsg({
          type: 'error',
          text: `${oversized.length} photo(s) exceeded the 1MB limit and were skipped. Only photos under 1MB are allowed.`,
        });
      }

      if (accepted.length > 0) {
        setUploadFiles((prev) => {
          const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
          const newUnique = accepted.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
          return [...prev, ...newUnique];
        });
      }
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartUpload = () => {
    if (!selectedEventId || selectedEventId === 'all') {
      const defaultId = getMostRecentPassedEventId(events);
      if (defaultId) {
        setSelectedEventId(defaultId);
      } else if (events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    }
    setUploadFiles([]);
    setUploadCaption('');
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setStatusMsg({
        type: 'success',
        text: `Successfully uploaded ${created.length} photo(s) to the gallery!`,
      });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to upload photos. Please try again.',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleStartEdit = (photo: GalleryPhoto) => {
    setEditingPhoto(photo);
    setEditCaptionText(photo.caption || '');
  };

  const executeUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    setIsSavingEdit(true);
    try {
      const updated = await updateGalleryPhoto(editingPhoto.id, {
        caption: editCaptionText,
        display_order: editingPhoto.display_order ?? 0,
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
      setStatusMsg({ type: 'success', text: 'Photo deleted successfully.' });
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
              Select an event to upload, manage, and showcase high-resolution event moments.
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

      {/* Event Selector & Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: Event Selection List */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[385px] relative overflow-hidden">
          <div className="flex items-center justify-between px-1 pb-2.5 shrink-0 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Select Event</span>
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {events.length} Events
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pt-2.5 pb-2 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Option to show all photos */}
            <button
              type="button"
              onClick={() => setSelectedEventId('all')}
              className={`w-full p-2.5 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                selectedEventId === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">All Events</p>
                <p className={`text-[10px] truncate mt-0.5 ${selectedEventId === 'all' ? 'text-blue-100' : 'text-slate-400'}`}>
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
                  className={`w-full p-2.5 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
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
                          {formatToDDMMYYYY(evt.date)}
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
        <div className="lg:col-span-2 flex flex-col h-[385px] gap-3.5">
          {/* Selected Event Details Header */}
          {selectedEvent && selectedEventId !== 'all' ? (
            <div className="p-4 sm:p-5 rounded-3xl bg-blue-50/70 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-700 dark:text-sky-400">
                    {selectedEvent.category || 'Event'}
                  </span>
                  {selectedEvent.date && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {formatToDDMMYYYY(selectedEvent.date)}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {selectedEvent.title}
                </h3>
                {selectedEvent.description && selectedEvent.description.trim() && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xl font-medium leading-relaxed">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                onClick={handleStartUpload}
                className="shrink-0 shadow-md shadow-blue-500/20"
              >
                Upload Event Photos
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-sm">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Displaying all {photosList.length} photos across all events
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={<Upload className="w-3.5 h-3.5" />}
                onClick={handleStartUpload}
                className="shadow-md shadow-blue-500/20"
              >
                Upload Event Photos
              </Button>
            </div>
          )}

          {/* Photo Gallery Scrollable Container Card */}
          <div className="flex-1 min-h-0 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden relative">
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
                    Click the button below to upload photos for this event.
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
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {visiblePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setPreviewPhoto(photo)}
                      className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm aspect-square flex flex-col justify-end cursor-pointer"
                    >
                      <img
                        src={photo.image_url}
                        alt={photo.caption || 'Event photo'}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Top Action Buttons (Edit & Delete on Top Right) */}
                      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(photo);
                          }}
                          className="p-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white transition-all cursor-pointer shadow-md"
                          title="Edit Caption / Order"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoToDelete(photo);
                          }}
                          className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white transition-all cursor-pointer shadow-md"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Caption Badge at Bottom: single line truncate, no wrap */}
                      {photo.caption && (
                        <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
                          <span className="px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-md text-[10px] font-medium text-white truncate block max-w-full shadow-sm">
                            {photo.caption}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom scroll fade indicator for photos */}
            {visiblePhotos.length > 0 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-slate-900 to-transparent rounded-b-3xl" />
            )}
          </div>
        </div>
      </div>

      {/* Upload Photos Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !isUploading && setIsUploadModalOpen(false)}
        title="Upload Event Photos"
        maxWidth="max-w-xl"
      >
        <form onSubmit={executeUpload} className="space-y-4">
          {/* Target Event Selection */}
          <div>
            <CustomSelect
              label="Select Event *"
              value={selectedEventId === 'all' ? (getMostRecentPassedEventId(events) || events[0]?.id || '') : selectedEventId}
              onChange={(val) => setSelectedEventId(val)}
              options={eventSelectOptions}
              placeholder="Select Event"
            />
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
                Supports PNG, JPG, JPEG, WEBP • Max 1MB per photo
              </p>
            </div>
          </div>

          {/* Selected Files Count Preview & Chips */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <div className="p-2.5 px-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-sky-400 flex items-center justify-between">
                <span>{uploadFiles.length} photo(s) selected</span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-[11px] text-red-500 hover:underline cursor-pointer font-semibold"
                >
                  Clear all
                </button>
              </div>

              {/* Scrollable chip list: fits 3 items, smooth invisible scroll on 4+ */}
              <div className="max-h-[162px] overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {uploadFilePreviews.map((item, idx) => (
                  <div
                    key={`${item.file.name}_${item.file.size}_${idx}`}
                    className="p-1.5 sm:p-2 px-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 group/chip transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Photo Thumbnail (Replaces Logo) */}
                      <button
                        type="button"
                        onClick={() => setPreviewLocalPhoto({ url: item.url, name: item.file.name })}
                        className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-200 dark:bg-slate-700 cursor-pointer relative group/thumb shadow-sm"
                        title="Click to preview full photo"
                      >
                        <img
                          src={item.url}
                          alt={item.file.name}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </button>

                      {/* File Details */}
                      <button
                        type="button"
                        onClick={() => setPreviewLocalPhoto({ url: item.url, name: item.file.name })}
                        className="text-left min-w-0 flex-1 cursor-pointer group-hover/chip:text-blue-600 dark:group-hover/chip:text-sky-400 transition-colors"
                        title="Click to preview full photo"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(item.file.size / 1024).toFixed(0)} KB • Click to preview
                        </span>
                      </button>
                    </div>

                    {/* Remove photo button */}
                    <button
                      type="button"
                      onClick={() => removeUploadFile(idx)}
                      className="p-1.5 rounded-xl hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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
                <span>Uploading photos...</span>
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

      {/* Full Preview Modal for Selected Local Photo */}
      <Modal
        isOpen={!!previewLocalPhoto}
        onClose={() => setPreviewLocalPhoto(null)}
        title={previewLocalPhoto?.name || 'Photo Preview'}
        maxWidth="max-w-3xl"
      >
        {previewLocalPhoto && (
          <div className="space-y-3">
            <div className="max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950">
              <img
                src={previewLocalPhoto.url}
                alt={previewLocalPhoto.name}
                className="max-h-[68vh] object-contain"
              />
            </div>
            <p className="text-xs font-semibold text-center text-slate-700 dark:text-slate-300">
              {previewLocalPhoto.name}
            </p>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!photoToDelete}
        onClose={() => setPhotoToDelete(null)}
        onConfirm={executeDeletePhoto}
        title="Delete Photo from Gallery?"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete Photo"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
