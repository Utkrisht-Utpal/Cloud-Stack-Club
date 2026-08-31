import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Crop,
  Trash2,
  Edit3,
  RefreshCw,
  Sparkles,
  User,
  GraduationCap,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ImageCropModal } from './ImageCropModal';
import { EditMemberDescriptionModal } from './EditMemberDescriptionModal';
import {
  getCoreTeamMembersAdmin,
  updateCoreTeamMemberDescription,
  uploadCoreTeamPhoto,
  deleteCoreTeamPhoto,
} from '../../services/members';
import type { CoreTeamMember } from '../../types/database';

export const TeamMediaManagement: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<CoreTeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Crop & Upload state
  const [rawUploadFile, setRawUploadFile] = useState<File | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Description state
  const [isEditDescOpen, setIsEditDescOpen] = useState<boolean>(false);

  // Delete Photo state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<boolean>(false);

  // Notification Toast
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusNotice({ type, text });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const loadTeamMembers = async () => {
    try {
      const list = await getCoreTeamMembersAdmin();
      setTeamMembers(list);
      if (list.length > 0 && !selectedMemberId) {
        setSelectedMemberId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading core team members:', err);
      showToast('Could not load core team members.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeamMembers();
  };

  // Filtered members list by search query
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return teamMembers;
    return teamMembers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const role = (m.role || '').toLowerCase();
      const dept = (m.department || '').toLowerCase();
      const year = (m.year || '').toLowerCase();
      return name.includes(q) || role.includes(q) || dept.includes(q) || year.includes(q);
    });
  }, [teamMembers, searchQuery]);

  // Selected member object
  const selectedMember = useMemo(() => {
    return teamMembers.find((m) => m.id === selectedMemberId) || filteredMembers[0] || null;
  }, [teamMembers, selectedMemberId, filteredMembers]);

  // Trigger file upload from local machine
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRawUploadFile(file);
      setIsCropModalOpen(true);
      e.target.value = '';
    }
  };

  // Handle cropped image upload to Cloudflare R2
  const handleCropComplete = async (croppedFile: File) => {
    if (!selectedMember) return;
    setIsUploadingPhoto(true);

    try {
      const newPhotoUrl = await uploadCoreTeamPhoto(selectedMember.id, croppedFile);

      // Update local state instantly
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, photo_url: newPhotoUrl } : m))
      );

      showToast(`Profile photo updated for ${selectedMember.name}!`);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      showToast(err?.message || 'Failed to upload photo.', 'error');
    } finally {
      setIsUploadingPhoto(false);
      setRawUploadFile(null);
    }
  };

  // Handle bio / description save
  const handleSaveDescription = async (newDesc: string) => {
    if (!selectedMember) return;

    await updateCoreTeamMemberDescription(selectedMember.id, newDesc);

    // Update local state
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === selectedMember.id ? { ...m, description: newDesc } : m))
    );

    showToast(`Description updated for ${selectedMember.name}!`);
  };

  // Handle photo deletion
  const handleDeletePhotoConfirm = async () => {
    if (!selectedMember || !selectedMember.photo_url) return;
    setIsDeletingPhoto(true);

    try {
      await deleteCoreTeamPhoto(selectedMember.id, selectedMember.photo_url);

      // Update local state
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, photo_url: null } : m))
      );

      setIsDeleteConfirmOpen(false);
      showToast(`Photo removed for ${selectedMember.name}`);
    } catch (err: any) {
      console.error('Delete photo error:', err);
      showToast(err?.message || 'Failed to delete photo.', 'error');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Notice */}
      <AnimatePresence>
        {statusNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold border shadow-md ${
              statusNotice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusNotice.text}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              className="p-1 hover:opacity-80 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Split-Pane Card matching Image 3 */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* Header Title + Refresh */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Meet Our Team Media &amp; Profile Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage 4:5 executive portraits and bio descriptions for active Core Council members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Records'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading core team members...</p>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="py-16 text-center space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Core Members Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To add members to this section, navigate to <strong>Members Management</strong> and toggle <strong>Core Member</strong> on any active member record. They will automatically appear here!
            </p>
          </div>
        ) : (
          /* Split-Pane: Left List + Right Preview */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── LEFT PANE: Search Bar & Member List (Image 3 Left) ── */}
            <div className="lg:col-span-5 flex flex-col space-y-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800/60">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, role, dept..."
                  className="w-full h-10 pl-9.5 pr-3.5 rounded-xl bg-white dark:bg-slate-900 text-xs sm:text-sm border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                />
              </div>

              {/* Members List Header & Count */}
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Core Members</span>
                <span>{filteredMembers.length} Total</span>
              </div>

              {/* Scrollable Member List (Hidden Scrollbar Style) */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-none pr-0.5">
                {filteredMembers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No members match "{searchQuery}"
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = selectedMember?.id === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`w-full p-3 rounded-xl transition-all flex items-center justify-between gap-3 text-left cursor-pointer group ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/50 font-bold'
                            : 'bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {/* Member Name & Photo Indicator */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-sky-400'
                          }`}>
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-extrabold truncate">
                              {member.name}
                            </div>
                            <div className={`text-[11px] truncate ${
                              isSelected
                                ? 'text-blue-100'
                                : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                            }`}>
                              {member.role || 'Core Member'}
                            </div>
                          </div>
                        </div>

                        {/* Department on the right */}
                        <div className={`text-right shrink-0 text-[11px] font-semibold ${
                          isSelected
                            ? 'text-blue-100'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                        }`}>
                          <div className="truncate max-w-[110px]">{member.department || 'N/A'}</div>
                          <div className="text-[10px] opacity-80">{member.year || ''}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── RIGHT PANE: Preview of Member Details & Action Controls (Image 3 Right) ── */}
            <div className="lg:col-span-7 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800/60 space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                  <span>Preview of Member Details</span>
                </span>

                {selectedMember && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400">
                    {selectedMember.role || 'Executive Member'}
                  </span>
                )}
              </div>

              {selectedMember ? (
                <div className="space-y-4">
                  {/* Photo Preview Card Optimized for 4:5 Ratio */}
                  <div className="relative w-full max-w-[340px] mx-auto overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl group">
                    <div style={{ aspectRatio: '4/5' }} className="relative w-full overflow-hidden flex items-center justify-center bg-slate-950">
                      {selectedMember.photo_url ? (
                        <img
                          src={selectedMember.photo_url}
                          alt={selectedMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                            <User className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-300">No Photo Uploaded</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Upload a 4:5 portrait photo for the Meet Our Team section.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Top Action Overlay Buttons: Crop/Upload & Delete (Image 3 Upper Right) */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                        {/* Crop / Upload Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-lg hover:scale-105 transition-all cursor-pointer"
                          title="Upload & Crop Photo"
                        >
                          <Crop className="w-4 h-4 text-sky-400" />
                        </button>

                        {/* Delete Photo Button */}
                        {selectedMember.photo_url && (
                          <button
                            type="button"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            disabled={isDeletingPhoto}
                            className="p-2 rounded-xl bg-black/60 hover:bg-rose-900/80 backdrop-blur-md text-rose-400 hover:text-rose-300 border border-rose-500/30 shadow-lg hover:scale-105 transition-all cursor-pointer"
                            title="Delete Photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Ratio tag indicator */}
                      <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
                        4:5 Ratio
                      </div>
                    </div>
                  </div>

                  {/* Hidden Native File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {/* Member Meta: Name, Year, Role, Department (Image 3 Middle) */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {selectedMember.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-sky-400">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>{selectedMember.year || 'Year N/A'}</span>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{selectedMember.department || 'Department N/A'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-sky-400 border border-blue-200 dark:border-blue-500/30">
                          {selectedMember.role || 'Core Council'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description Box with Edit Button (Image 3 Lower Right) */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                        <span>Member Bio / Description</span>
                      </span>

                      {/* Edit Description Icon Button */}
                      <button
                        type="button"
                        onClick={() => setIsEditDescOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Edit Description"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Bio</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed min-h-[64px] flex items-center">
                      {selectedMember.description ? (
                        <p className="whitespace-pre-line">{selectedMember.description}</p>
                      ) : (
                        <p className="text-slate-400 italic text-xs">
                          No bio description added yet. Click "Edit Bio" above to describe this core team member's role and contributions.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Select a member from the left list to view and manage details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Crop Modal */}
      {selectedMember && isCropModalOpen && rawUploadFile && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            setRawUploadFile(null);
          }}
          imageFile={rawUploadFile}
          onCropComplete={handleCropComplete}
          memberName={selectedMember.name}
        />
      )}

      {/* Edit Bio Description Modal */}
      {selectedMember && isEditDescOpen && (
        <EditMemberDescriptionModal
          isOpen={isEditDescOpen}
          onClose={() => setIsEditDescOpen(false)}
          memberName={selectedMember.name}
          memberRole={selectedMember.role}
          initialDescription={selectedMember.description}
          onSave={handleSaveDescription}
        />
      )}

      {/* Delete Photo Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeletePhotoConfirm}
        title="Delete Profile Photo"
        message={`Are you sure you want to remove the profile photo for ${selectedMember?.name}? This will remove it from the Cloudflare R2 storage and reset the member's photo.`}
        confirmText={isDeletingPhoto ? 'Deleting...' : 'Delete Photo'}
        variant="danger"
      />
    </div>
  );
};
