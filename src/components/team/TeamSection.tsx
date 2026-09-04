import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  User,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getCoreMembers, getTeamPageBanner, type CoreMember, type TeamPageBannerData } from '../../services/members';

export const TeamSection: React.FC = () => {
  const [members, setMembers] = useState<CoreMember[]>([]);
  const [bannerData, setBannerData] = useState<TeamPageBannerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMemberModal, setSelectedMemberModal] = useState<CoreMember | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getCoreMembers(),
      getTeamPageBanner(),
    ])
      .then(([membersData, banner]) => {
        if (isMounted) {
          setMembers(membersData);
          setBannerData(banner);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading team data:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
        >
          Meet Our Team
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium"
        >
          The dedicated student developers, mentors, and community leads driving innovation and cloud learning at Chandigarh University.
        </motion.p>
      </div>

      {/* Top Banner (Full Width above the cards grid) */}
      {bannerData?.banner_url && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl bg-slate-950 group"
        >
          <div className="relative w-full overflow-hidden">
            <img
              src={bannerData.banner_url}
              alt="Meet Our Team Banner"
              className="w-full max-h-[420px] sm:max-h-[500px] object-cover object-center group-hover:scale-101 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </motion.div>
      )}

      {/* Grid of Core Member Cards */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading team members...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="py-20 text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Core Team Roster Updating Soon
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Our active core council profiles are currently being updated. Check back shortly to see our executive council members!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7">
          {members.map((member, idx) => (
            <motion.div
              key={member.id || member.name + idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedMemberModal(member)}
              className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-2xl hover:border-blue-500/40 dark:hover:border-sky-400/40 transition-all duration-300 flex flex-col justify-between cursor-pointer active:scale-[0.99]"
            >
              {/* 4:5 Ratio Portrait Photo Container */}
              <div className="relative w-full overflow-hidden bg-slate-950" style={{ aspectRatio: '4/5' }}>
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950/40 text-slate-600 p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                      <User className="w-10 h-10" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 mt-3">
                      Cloud Stack Club
                    </span>
                  </div>
                )}

                {/* Gradient vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80 pointer-events-none" />

                {/* Role Pill on top of photo */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                  <span className="px-3 py-1 rounded-xl text-xs font-black tracking-wide bg-blue-600/90 text-white backdrop-blur-md shadow-lg border border-blue-400/30 truncate">
                    {member.role?.name || 'Core Member'}
                  </span>

                  {member.year && (
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-black/60 text-slate-200 backdrop-blur-md border border-white/15 shrink-0">
                      {member.year}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                    {member.name}
                  </h3>

                  {member.department && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-sky-400" />
                      <span className="truncate">{member.department}</span>
                    </div>
                  )}
                </div>

                {/* Description / Bio */}
                {member.description ? (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {member.description}
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      Core Council Member • Cloud Stack Club
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Member Details Popup Modal */}
      {selectedMemberModal && (
        <Modal
          isOpen={!!selectedMemberModal}
          onClose={() => setSelectedMemberModal(null)}
          title="Core Council Member Details"
          maxWidth="max-w-4xl lg:max-w-5xl"
        >
          <div className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-stretch">
              {/* Member Photo (4:5 on mobile, stretches to match right column baseline on md+) */}
              <div className="md:col-span-5 w-full flex flex-col min-h-0">
                <div className="relative w-full aspect-[4/5] md:aspect-auto md:h-full flex-1 rounded-2xl lg:rounded-3xl overflow-hidden bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-xl group flex flex-col min-h-0">
                  {selectedMemberModal.photo_url ? (
                    <img
                      src={selectedMemberModal.photo_url}
                      alt={selectedMemberModal.name}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02] flex-1 min-h-0"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 p-6 text-center flex-1">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-400 mb-3">
                        <User className="w-10 h-10" />
                      </div>
                      <span className="text-xs font-bold">Cloud Stack Club</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Member Info & Contributions */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-5 min-w-0 w-full min-h-0">
                {/* Header Information */}
                <div className="space-y-2.5 sm:space-y-3">
                  {/* Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-blue-600 dark:bg-blue-500 text-white shadow-sm shadow-blue-500/25 tracking-wide">
                      {selectedMemberModal.role?.name || 'Core Member'}
                    </span>

                    {selectedMemberModal.year && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                        <span>{selectedMemberModal.year}</span>
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    {selectedMemberModal.name}
                  </h3>

                  {/* Department / Discipline */}
                  {selectedMemberModal.department && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 w-fit">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                      <span>{selectedMemberModal.department}</span>
                    </div>
                  )}
                </div>

                {/* About & Contributions Section */}
                <div className="rounded-2xl p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3 shadow-xs flex-1 flex flex-col justify-start min-h-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
                    <span>About &amp; Contributions</span>
                  </div>

                  {selectedMemberModal.description ? (
                    <div className="max-h-[360px] sm:max-h-[440px] overflow-y-auto custom-scrollbar pr-2 sm:pr-3 flex-1">
                      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                        {selectedMemberModal.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic py-2">
                      Core Council Member • Cloud Stack Club, Chandigarh University.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
