import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  Sparkles,
  User,
} from 'lucide-react';
import { getCoreMembers, type CoreMember } from '../../services/members';

export const TeamSection: React.FC = () => {
  const [members, setMembers] = useState<CoreMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getCoreMembers()
      .then((data) => {
        if (isMounted) {
          setMembers(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading team members:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Executive Leadership &amp; Core Council</span>
        </motion.div>

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
          className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed"
        >
          The dedicated student developers, mentors, and community leads driving innovation and cloud learning at Chandigarh University.
        </motion.p>
      </div>

      {/* Grid of 4:5 Core Member Cards */}
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
              className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-2xl hover:border-blue-500/40 dark:hover:border-sky-400/40 transition-all duration-300 flex flex-col justify-between"
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
    </section>
  );
};
