import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Trophy } from 'lucide-react';
import { CertificatesSection } from '../components/certificates/CertificatesSection';
import { AchievementsShowcase } from '../components/achievements/AchievementsShowcase';

interface AchievementsPageProps {
  defaultTab?: 'certificates' | 'achievements';
}

export const AchievementsPage: React.FC<AchievementsPageProps> = ({ defaultTab = 'certificates' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'certificates' | 'achievements'>(
    tabParam === 'achievements'
      ? 'achievements'
      : tabParam === 'certificates'
      ? 'certificates'
      : defaultTab
  );

  useEffect(() => {
    if (tabParam === 'achievements') {
      setActiveTab('achievements');
    } else if (tabParam === 'certificates') {
      setActiveTab('certificates');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'certificates' | 'achievements') => {
    setActiveTab(tab);
    setSearchParams(tab === 'certificates' ? {} : { tab });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 space-y-6">
        {/* Two-Division Mode Switcher Pill (Matching Gallery Style) */}
        <div className="flex justify-center pb-2">
          <div className="inline-flex items-center p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              type="button"
              onClick={() => handleTabChange('certificates')}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'certificates'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Member Certificates</span>
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

            <button
              type="button"
              onClick={() => handleTabChange('achievements')}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'achievements'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Achievements</span>
            </button>
          </div>
        </div>

        {/* View Switcher: Member Certificates OR Achievements Showcase */}
        {activeTab === 'certificates' ? (
          <CertificatesSection standalone />
        ) : (
          <AchievementsShowcase />
        )}
      </div>
    </div>
  );
};

export default AchievementsPage;
