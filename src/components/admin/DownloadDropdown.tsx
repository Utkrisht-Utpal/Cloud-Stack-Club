import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { exportMembersToExcel, exportMembersToPdf } from '../../utils/exportDirectory';
import type { Member } from '../../types/database';

interface DownloadDropdownProps {
  members: Member[];
  currentFilter: 'all' | 'members' | 'core';
  searchQuery: string;
}

export const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
  members,
  currentFilter,
  searchQuery,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Esc key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportExcel = () => {
    setIsOpen(false);
    exportMembersToExcel(members, currentFilter, searchQuery);
  };

  const handleExportPdf = () => {
    setIsOpen(false);
    exportMembersToPdf(members, currentFilter, searchQuery);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-10 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-between gap-2 cursor-pointer border border-blue-500/30 shrink-0"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Download as Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Download as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
