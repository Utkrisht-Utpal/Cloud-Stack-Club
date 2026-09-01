import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
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
  Upload,
  Maximize2,
  ImageIcon,
} from 'lucide-react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Modal } from '../ui/Modal';
import { ImageCropModal } from './ImageCropModal';
import { EditMemberDescriptionModal } from './EditMemberDescriptionModal';
import {
  getCoreTeamMembersAdmin,
  updateCoreTeamMemberDescription,
  uploadCoreTeamPhoto,
  deleteCoreTeamPhoto,
  getTeamPageBanner,
  uploadTeamPageBanner,
  deleteTeamPageBanner,
  type TeamPageBannerData,
} from '../../services/members';
import type { CoreTeamMember } from '../../types/database';

export const TeamMediaManagement: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<CoreTeamMember[]>([]);
  const [bannerData, setBannerData] = useState<TeamPageBannerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>('__banner__');

  // Crop & Upload state
  const [rawUploadFile, setRawUploadFile] = useState<File | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo / Banner Lightbox state
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  // Bio Modal state
  const [isBioModalOpen, setIsBioModalOpen] = useState<boolean>(false);
  const [bioModalMode, setBioModalMode] = useState<'view' | 'edit'>('view');

  // Delete Confirm state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState<boolean>(false);

  // Notification Toast
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusNotice({ type, text });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const loadData = async () => {
    try {
      const [membersList, banner] = await Promise.all([
        getCoreTeamMembersAdmin(),
        getTeamPageBanner(),
      ]);

      setTeamMembers(membersList);
      setBannerData(banner);

      if (!selectedMemberId) {
        setSelectedMemberId('__banner__');
      }
    } catch (err) {
      console.error('Error loading team management data:', err);
      showToast('Could not load team media data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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

  // Selected member object (null if '__banner__' is selected)
  const isBannerSelected = selectedMemberId === '__banner__';
  const selectedMember = useMemo(() => {
    if (isBannerSelected) return null;
    return teamMembers.find((m) => m.id === selectedMemberId) || null;
  }, [teamMembers, selectedMemberId, isBannerSelected]);

  // Trigger file upload from local machine (Max 5MB for Banner, Max 1MB for Member Photos)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxAllowedSize = isBannerSelected ? 5 * 1024 * 1024 : 1 * 1024 * 1024;
      const sizeLimitLabel = isBannerSelected ? '5 MB' : '1 MB';

      if (file.size > maxAllowedSize) {
        showToast(
          `File size exceeds the allowed limit of ${sizeLimitLabel} for ${
            isBannerSelected ? 'the team banner' : 'member profile photos'
          }.`,
          'error'
        );
        e.target.value = '';
        return;
      }

      setRawUploadFile(file);
      setIsCropModalOpen(true);
      e.target.value = '';
    }
  };

  // Handle cropped image upload to Cloudflare R2
  const handleCropComplete = async (croppedFile: File) => {
    setIsUploadingMedia(true);

    try {
      if (isBannerSelected) {
        // Upload Team Page Banner
        const newBannerUrl = await uploadTeamPageBanner(croppedFile);
        setBannerData((prev) => ({
          ...prev,
          banner_url: newBannerUrl,
        }));
        showToast('Meet Our Team banner updated successfully!');
      } else if (selectedMember) {
        // Upload Member Photo
        const newPhotoUrl = await uploadCoreTeamPhoto(selectedMember.id, croppedFile);
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === selectedMember.id ? { ...m, photo_url: newPhotoUrl } : m))
        );
        showToast(`Profile photo updated for ${selectedMember.name}!`);
      }
    } catch (err: any) {
      console.error('Media upload error:', err);
      showToast(err?.message || 'Failed to upload image.', 'error');
    } finally {
      setIsUploadingMedia(false);
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

  // Handle media deletion
  const handleDeleteMediaConfirm = async () => {
    setIsDeletingMedia(true);

    try {
      if (isBannerSelected && bannerData?.banner_url) {
        await deleteTeamPageBanner(bannerData.banner_url);
        setBannerData((prev) => ({
          ...prev,
          banner_url: null,
        }));
        setIsDeleteConfirmOpen(false);
        showToast('Team banner removed successfully.');
      } else if (selectedMember && selectedMember.photo_url) {
        await deleteCoreTeamPhoto(selectedMember.id, selectedMember.photo_url);
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === selectedMember.id ? { ...m, photo_url: null } : m))
        );
        setIsDeleteConfirmOpen(false);
        showToast(`Photo removed for ${selectedMember.name}`);
      }
    } catch (err: any) {
      console.error('Delete media error:', err);
      showToast(err?.message || 'Failed to delete image.', 'error');
    } finally {
      setIsDeletingMedia(false);
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

      {/* Main Split-Pane Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* Header Title + Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Our Team Profiles &amp; Media Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage wide team section banners, executive portraits, roles, and bio descriptions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Records'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading team media data...</p>
          </div>
        ) : (
          /* Split-Pane: Left List + Right Preview */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── LEFT PANE: Search Bar & Selection List ── */}
            <div className="lg:col-span-5 flex flex-col space-y-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800/60">
              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, role, dept..."
                  className="w-full h-10 pl-9.5 pr-3.5 rounded-xl bg-white dark:bg-slate-900 text-xs sm:text-sm border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                />
              </div>

              {/* Section Header & Count */}
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                <span>Sections &amp; Members</span>
                <span>{filteredMembers.length} Members</span>
              </div>

              {/* Scrollable Selection List */}
              <div className="space-y-1.5 max-h-[632px] overflow-y-auto scrollbar-none pr-0.5">
                {/* Pinned Top Item: Team Section Banner */}
                <button
                  type="button"
                  onClick={() => setSelectedMemberId('__banner__')}
                  className={`w-full p-3 rounded-xl transition-all flex items-center justify-between gap-3 text-left cursor-pointer group ${
                    isBannerSelected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/50 font-bold'
                      : 'bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-500/30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                      isBannerSelected ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-sky-400'
                    }`}>
                      {bannerData?.banner_url ? (
                        <img
                          src={bannerData.banner_url}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-extrabold truncate flex items-center gap-1.5">
                        <span>🌟 Team Section Banner</span>
                      </div>
                      <div className={`text-[11px] truncate ${
                        isBannerSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {bannerData?.banner_url ? '1 Banner Active' : 'No Banner Uploaded'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isBannerSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20'
                    }`}>
                      Cover Banner
                    </span>
                  </div>
                </button>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="border-t border-slate-200/80 dark:border-slate-800/80" />
                </div>

                {/* Core Member Items */}
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

            {/* ── RIGHT PANE: Preview of Details & Action Controls ── */}
            <div className="lg:col-span-7 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800/60 space-y-4">
              {/* Header: Centered */}
              <div className="flex items-center justify-center pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60 text-center shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                  <span>
                    {isBannerSelected
                      ? 'PREVIEW OF MEET OUR TEAM BANNER'
                      : 'PREVIEW OF MEMBER DETAILS'}
                  </span>
                </span>
              </div>

              {/* VIEW 1: BANNER MANAGEMENT VIEW */}
              {isBannerSelected ? (
                <div className="w-full space-y-4">
                  {/* Landscape Banner Frame (16:9 Ratio) */}
                  <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md group">
                      <div style={{ aspectRatio: '16/9' }} className="relative w-full overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                        {bannerData?.banner_url ? (
                          <div
                            onClick={() => {
                              setLightboxImageUrl(bannerData.banner_url);
                              setLightboxTitle('Meet Our Team Section Banner');
                            }}
                            className="w-full h-full relative cursor-pointer group/banner"
                            title="Click to view full banner"
                          >
                            <img
                              src={bannerData.banner_url}
                              alt="Team Banner"
                              className="w-full h-full object-cover group-hover/banner:scale-102 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>View Full Banner</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* No Banner Uploaded Placeholder */
                          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-400 shadow-sm">
                              <ImageIcon className="w-8 h-8" />
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                No Team Banner Uploaded
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto">
                                Upload a wide landscape banner to feature at the top of the Meet Our Team page.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingMedia}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
                            >
                              <Upload className="w-4 h-4" />
                              <span>Upload Banner</span>
                            </button>
                          </div>
                        )}

                        {/* Top Action Overlay Button for Banner */}
                        {bannerData?.banner_url && (
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDeleteConfirmOpen(true);
                              }}
                              disabled={isDeletingMedia}
                              className="p-2 rounded-xl bg-black/60 hover:bg-rose-900/80 backdrop-blur-md text-rose-400 hover:text-rose-300 border border-rose-500/30 shadow-lg hover:scale-105 transition-all cursor-pointer"
                              title="Delete Banner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Banner Info Box */}
                    <div className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        <ImageIcon className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                        <span>Team Page Header Banner Placement</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        This banner is displayed covering the whole width at the top of the public <strong>Meet Our Team</strong> section right above the 4-column council cards.
                      </p>
                    </div>
                  </div>
                ) : selectedMember ? (
                /* VIEW 2: INDIVIDUAL MEMBER MANAGEMENT VIEW */
                <div className="w-full space-y-4">
                  {/* Photo Preview Card (Centered 4:5 Portrait) */}
                  <div className="relative w-full max-w-[340px] mx-auto overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-md group">
                    <div style={{ aspectRatio: '4/5' }} className="relative w-full overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                      {selectedMember.photo_url ? (
                        /* When photo exists: clicking opens Lightbox Popup */
                        <div
                          onClick={() => {
                            setLightboxImageUrl(selectedMember.photo_url);
                            setLightboxTitle(`Profile Photo — ${selectedMember.name}`);
                          }}
                          className="w-full h-full relative cursor-pointer group/photo"
                          title="Click to view full photo"
                        >
                          <img
                            src={selectedMember.photo_url}
                            alt={selectedMember.name}
                            className="w-full h-full object-cover group-hover/photo:scale-103 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>View Full Photo</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* When NO photo: interactive upload button */
                        <div className="flex flex-col items-center justify-center gap-3.5 p-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-400 shadow-sm">
                            <User className="w-8 h-8" />
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Photo Uploaded</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] mx-auto">
                              Upload a portrait photo for the Meet Our Team section.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingMedia}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Upload Image</span>
                          </button>
                        </div>
                      )}

                      {/* Top Action Overlay Button */}
                      {selectedMember.photo_url && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeleteConfirmOpen(true);
                            }}
                            disabled={isDeletingMedia}
                            className="p-2 rounded-xl bg-black/60 hover:bg-rose-900/80 backdrop-blur-md text-rose-400 hover:text-rose-300 border border-rose-500/30 shadow-lg hover:scale-105 transition-all cursor-pointer"
                            title="Delete Photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Member Meta: Name, Year, Role, Department (Image 1 Style) */}
                  <div className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-2">
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
                          {selectedMember.role || 'Core Member'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description Box with Click-to-View Modal & Edit Button */}
                  <div className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                        <span>Member Bio / Description</span>
                      </span>

                      {/* Edit Description Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBioModalMode('edit');
                          setIsBioModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Edit Description"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Bio</span>
                      </button>
                    </div>

                    {/* Clickable Bio Box -> Opens Squarish View/Edit Modal (Truncated to 1 line) */}
                    <div
                      onClick={() => {
                        setBioModalMode('view');
                        setIsBioModalOpen(true);
                      }}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-normal flex items-center cursor-pointer hover:border-blue-500/40 dark:hover:border-sky-500/40 transition-colors group/bio overflow-hidden"
                      title="Click to view full bio in popup"
                    >
                      {selectedMember.description ? (
                        <p className="truncate w-full block overflow-hidden text-ellipsis whitespace-nowrap group-hover/bio:text-blue-600 dark:group-hover/bio:text-sky-400 transition-colors">
                          {selectedMember.description}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-xs truncate w-full block overflow-hidden text-ellipsis whitespace-nowrap">
                          No bio description added yet. Click "Edit Bio" above to describe this core team member's role and contributions.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Select a section or member from the left list to view and manage media.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Media Lightbox Popup Modal */}
      {lightboxImageUrl && (
        <Modal
          isOpen={!!lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
          title={lightboxTitle}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-2">
            <div className="overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
              <img
                src={lightboxImageUrl}
                alt={lightboxTitle}
                className="w-full max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Interactive Crop Modal */}
      {isCropModalOpen && rawUploadFile && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            setRawUploadFile(null);
          }}
          imageFile={rawUploadFile}
          onCropComplete={handleCropComplete}
          memberName={isBannerSelected ? 'Team Page Banner' : selectedMember?.name}
          initialAspectRatio={isBannerSelected ? '16:9' : '4:5'}
          maxOutputSizeBytes={isBannerSelected ? 5 * 1024 * 1024 : 1 * 1024 * 1024}
        />
      )}

      {/* Squarish Bio View / Edit Modal */}
      {selectedMember && isBioModalOpen && (
        <EditMemberDescriptionModal
          isOpen={isBioModalOpen}
          onClose={() => setIsBioModalOpen(false)}
          memberName={selectedMember.name}
          memberRole={selectedMember.role}
          initialDescription={selectedMember.description}
          initialMode={bioModalMode}
          onSave={handleSaveDescription}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteMediaConfirm}
        title={isBannerSelected ? 'Delete Team Page Banner' : 'Delete Profile Photo'}
        message={
          isBannerSelected
            ? 'Are you sure you want to remove the Meet Our Team banner image? This will remove it from Cloudflare R2 storage and reset the header.'
            : `Are you sure you want to remove the profile photo for ${selectedMember?.name}? This will remove it from the Cloudflare R2 storage and reset the member's photo.`
        }
        confirmText={isDeletingMedia ? 'Deleting...' : 'Delete Image'}
        variant="danger"
      />
    </div>
  );
};
