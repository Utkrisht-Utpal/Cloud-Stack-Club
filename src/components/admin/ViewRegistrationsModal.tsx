import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Users2,
  ArrowUp
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { 
  getEventRegistrationsService, 
  getTeamDetailsForRegistration, 
  getFormForEvent, 
  getRegistrationAnswersForEvent 
} from '../../services/registrationForms';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeFormulaValue } from '../../utils/exportDirectory';
import type { Event, EventRegistration, EventFormField } from '../../types/database';

/**
 * Validates that a string is a safe HTTP or HTTPS URL to prevent Stored XSS via javascript: or data: URIs.
 */
const isValidHttpUrl = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

interface ViewRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

export const ViewRegistrationsModal: React.FC<ViewRegistrationsModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
  const [selectedAnswersRegId, setSelectedAnswersRegId] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<{ field: 'date' | 'name'; order: 'asc' | 'desc' }>({
    field: 'date',
    order: 'asc',
  });

  // Team details cache: reg.id -> team info
  const [teamMap, setTeamMap] = useState<
    Record<
      string,
      {
        team_name: string;
        registration_number?: string | null;
        members: any[];
      }
    >
  >({});
  
  // Custom form questions & answers state
  const [formFields, setFormFields] = useState<EventFormField[]>([]);
  const [answersMap, setAnswersMap] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (isOpen && event) {
      loadRegistrations();
    }
  }, [isOpen, event]);

  const loadRegistrations = async () => {
    if (!event) return;
    setLoading(true);
    try {
      const data = await getEventRegistrationsService(event);
      setRegistrations(data);

      // Fetch team details for team registrations
      const newTeamMap: Record<
        string,
        {
          team_name: string;
          registration_number?: string | null;
          members: any[];
        }
      > = {};
      for (const reg of data) {
        if (reg.team_id) {
          const teamInfo = await getTeamDetailsForRegistration(reg.team_id);
          if (teamInfo) {
            newTeamMap[reg.id] = teamInfo;
          }
        }
      }
      setTeamMap(newTeamMap);

      // Fetch custom form questions & student answers for event
      const formObj = await getFormForEvent(event.id);
      const fieldsList = formObj?.fields || [];
      setFormFields(fieldsList);

      const regIds = data.map((r) => r.id);
      const answers = await getRegistrationAnswersForEvent(regIds);
      setAnswersMap(answers);
    } catch (err) {
      console.error('Error loading registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !event) return null;

  const filtered = registrations.filter((r) => {
    const q = searchQuery.toLowerCase();
    const teamInfo = teamMap[r.id];
    return (
      (r.registrant_name && r.registrant_name.toLowerCase().includes(q)) ||
      (r.registrant_email && r.registrant_email.toLowerCase().includes(q)) ||
      (r.registration_number && r.registration_number.toLowerCase().includes(q)) ||
      (teamInfo && teamInfo.team_name && teamInfo.team_name.toLowerCase().includes(q))
    );
  });

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    if (sortConfig.field === 'name') {
      const nameA = (a.registrant_name || '').trim().toLowerCase();
      const nameB = (b.registrant_name || '').trim().toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return sortConfig.order === 'asc' ? cmp : -cmp;
    }

    const timeA = new Date(a.submitted_at || (a as any).created_at || 0).getTime();
    const timeB = new Date(b.submitted_at || (b as any).created_at || 0).getTime();
    if (sortConfig.order === 'desc') {
      return timeB - timeA; // Most recent added first
    }
    return timeA - timeB; // Oldest first
  });

  const toggleExpand = (regId: string) => {
    setExpandedRegId((prev) => (prev === regId ? null : regId));
  };

  const handleExportExcel = () => {
    const exportRows: any[] = [];
    let serialNo = 1;

    sortedAndFiltered.forEach((r) => {
      const teamInfo = teamMap[r.id];
      const regAnswers = answersMap[r.id] || {};

      // Custom questions column dictionary for this registration
      const customAnswersDict: Record<string, any> = {};
      formFields.forEach((field) => {
        const ansVal = regAnswers[field.id] || regAnswers[field.field_key] || '';
        customAnswersDict[field.label] = sanitizeFormulaValue(ansVal);
      });

      if (teamInfo && teamInfo.members && teamInfo.members.length > 0) {
        // 1. Team Leader Row
        exportRows.push({
          'S.No': serialNo,
          'Registration No': sanitizeFormulaValue(r.registration_number || ''),
          'Team Reg ID': sanitizeFormulaValue(teamInfo.registration_number || ''),
          'Team Name': sanitizeFormulaValue(teamInfo.team_name || ''),
          'Member Role': 'Team Leader',
          'Member Name': sanitizeFormulaValue(r.registrant_name || ''),
          'Email': sanitizeFormulaValue(r.registrant_email || ''),
          'Phone': sanitizeFormulaValue(r.registrant_phone || ''),
          'University UID': sanitizeFormulaValue(r.uid || ''),
          ...customAnswersDict,
          'Submitted Date': r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-GB') : '',
        });

        // 2. Teammates Rows
        teamInfo.members.forEach((m, mIdx) => {
          const blankCustomDict: Record<string, string> = {};
          formFields.forEach((field) => {
            blankCustomDict[field.label] = '';
          });

          exportRows.push({
            'S.No': '',
            'Registration No': sanitizeFormulaValue(m.registration_number || ''),
            'Team Reg ID': sanitizeFormulaValue(teamInfo.registration_number || ''),
            'Team Name': sanitizeFormulaValue(teamInfo.team_name || ''),
            'Member Role': `Teammate #${mIdx + 2}`,
            'Member Name': sanitizeFormulaValue(m.name || ''),
            'Email': sanitizeFormulaValue(m.email || ''),
            'Phone': sanitizeFormulaValue(m.phone || ''),
            'University UID': sanitizeFormulaValue(m.uid || ''),
            ...blankCustomDict,
            'Submitted Date': r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-GB') : '',
          });
        });
      } else {
        // Individual Registrant Row
        exportRows.push({
          'S.No': serialNo,
          'Registration No': sanitizeFormulaValue(r.registration_number || ''),
          'Team Reg ID': '',
          'Team Name': '',
          'Member Role': 'Individual Registrant',
          'Member Name': sanitizeFormulaValue(r.registrant_name || ''),
          'Email': sanitizeFormulaValue(r.registrant_email || ''),
          'Phone': sanitizeFormulaValue(r.registrant_phone || ''),
          'University UID': sanitizeFormulaValue(r.uid || ''),
          ...customAnswersDict,
          'Submitted Date': r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-GB') : '',
        });
      }

      // 3. Leave a blank separator row after each registration ends
      const blankSeparatorDict: Record<string, string> = {};
      formFields.forEach((field) => {
        blankSeparatorDict[field.label] = '';
      });

      exportRows.push({
        'S.No': '',
        'Registration No': '',
        'Team Name': '',
        'Member Role': '',
        'Member Name': '',
        'Email': '',
        'Phone': '',
        'University UID': '',
        ...blankSeparatorDict,
        'Submitted Date': '',
      });

      serialNo++;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '_');
    XLSX.writeFile(workbook, `${cleanTitle}_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`Event Registrations — ${event.title}`, 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Registrations: ${sortedAndFiltered.length}  •  Export Date: ${new Date().toLocaleDateString('en-GB')}`, 14, 22);

    const pdfHeaders = ['#', 'Reg Number', 'Team Name', 'Role', 'Member Name', 'Email', 'Phone', 'UID'];
    formFields.forEach((field) => {
      pdfHeaders.push(field.label.slice(0, 18));
    });
    pdfHeaders.push('Date');

    const tableRows: string[][] = [];
    let serialNo = 1;

    sortedAndFiltered.forEach((r) => {
      const teamInfo = teamMap[r.id];
      const regAnswers = answersMap[r.id] || {};

      const customAnswersList = formFields.map((field) => {
        return regAnswers[field.id] || regAnswers[field.field_key] || '';
      });

      if (teamInfo && teamInfo.members && teamInfo.members.length > 0) {
        // Leader row
        tableRows.push([
          serialNo.toString(),
          r.registration_number || '',
          teamInfo.team_name || '',
          'Team Leader',
          r.registrant_name || '',
          r.registrant_email || '',
          r.registrant_phone || '',
          r.uid || '',
          ...customAnswersList,
          r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : '',
        ]);

        // Teammate rows
        const blankAnswersList = formFields.map(() => '');
        teamInfo.members.forEach((m, mIdx) => {
          tableRows.push([
            '',
            m.registration_number || r.registration_number || '',
            teamInfo.team_name || '',
            `Teammate #${mIdx + 2}`,
            m.name || '',
            m.email || '',
            m.phone || '',
            m.uid || '',
            ...blankAnswersList,
            '',
          ]);
        });
      } else {
        // Individual row
        tableRows.push([
          serialNo.toString(),
          r.registration_number || '',
          '',
          'Individual',
          r.registrant_name || '',
          r.registrant_email || '',
          r.registrant_phone || '',
          r.uid || '',
          ...customAnswersList,
          r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : '',
        ]);
      }

      // Blank separator row after each registration
      const blankRowList = pdfHeaders.map(() => '');
      tableRows.push(blankRowList);

      serialNo++;
    });

    autoTable(doc, {
      startY: 27,
      head: [pdfHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      margin: { top: 27, left: 10, right: 10, bottom: 15 },
    });

    const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '_');
    doc.save(`${cleanTitle}_Registrations_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Event Registrations — ${event.title}`}
      maxWidth="max-w-[92vw] lg:max-w-6xl"
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by registrant name, email, reg no, team name..."
              className="search-input w-full pl-10 pr-4 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-0 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={sortedAndFiltered.length === 0}
              className="h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={sortedAndFiltered.length === 0}
              className="h-11 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Registrations List Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-semibold">
            Loading registrations and team details...
          </div>
        ) : sortedAndFiltered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <Users className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
            <div className="text-sm font-bold text-slate-900 dark:text-white">No Registrations Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No students have registered for "{event.title}" matching your search criteria yet.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className={`overflow-x-auto ${sortedAndFiltered.length > 5 ? 'max-h-[390px] overflow-y-auto custom-scrollbar' : ''}`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] shadow-sm">
                  <tr>
                    <th className="py-3.5 px-2.5 font-black whitespace-nowrap w-10 text-center">#</th>
                    <th className="py-3.5 px-3 font-black whitespace-nowrap w-40">Registration No</th>
                    <th className="py-3.5 px-3 font-black whitespace-nowrap w-48">
                      <div className="flex items-center gap-1.5">
                        <span>Student Name</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSortConfig((prev) => ({
                              field: 'name',
                              order: prev.field === 'name' && prev.order === 'asc' ? 'desc' : 'asc',
                            }));
                          }}
                          className={`p-1 rounded-lg transition-all duration-200 cursor-pointer border select-none inline-flex items-center justify-center ${
                            sortConfig.field === 'name'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/25 ring-1 ring-blue-400/40'
                              : 'bg-slate-200 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-sky-400'
                          }`}
                          title={
                            sortConfig.field === 'name'
                              ? sortConfig.order === 'asc'
                                ? 'Sorted: A to Z (Click for Z to A)'
                                : 'Sorted: Z to A (Click for A to Z)'
                              : 'Click to sort by Student Name (A to Z)'
                          }
                          aria-label="Sort by Student Name"
                        >
                          <ArrowUp
                            className={`w-2.5 h-2.5 stroke-[2.5] transition-transform duration-200 ${
                              sortConfig.field === 'name'
                                ? sortConfig.order === 'asc'
                                  ? 'rotate-0'
                                  : 'rotate-180'
                                : 'rotate-0 opacity-60'
                            }`}
                          />
                        </button>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 font-black whitespace-nowrap w-52">Contact Details</th>
                    <th className="py-3.5 px-3 font-black whitespace-nowrap text-center w-38">Type / Team Details</th>
                    <th className="py-3.5 px-3 font-black whitespace-nowrap w-36">
                      <div className="flex items-center gap-1.5">
                        <span>Date & Time</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSortConfig((prev) => ({
                              field: 'date',
                              order: prev.field === 'date' && prev.order === 'desc' ? 'asc' : 'desc',
                            }));
                          }}
                          className={`p-1 rounded-lg transition-all duration-200 cursor-pointer border select-none inline-flex items-center justify-center ${
                            sortConfig.field === 'date'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/25 ring-1 ring-blue-400/40'
                              : 'bg-slate-200 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-sky-400'
                          }`}
                          title={
                            sortConfig.field === 'date'
                              ? sortConfig.order === 'desc'
                                ? 'Showing: Most Recent First (Click for Oldest First)'
                                : 'Showing: Oldest First (Click for Most Recent First)'
                              : 'Click to sort by Date & Time (Most Recent First)'
                          }
                          aria-label="Toggle recent added filter"
                        >
                          <ArrowUp
                            className={`w-2.5 h-2.5 stroke-[2.5] transition-transform duration-200 ${
                              sortConfig.field === 'date'
                                ? sortConfig.order === 'desc'
                                  ? 'rotate-0'
                                  : 'rotate-180'
                                : 'rotate-180 opacity-60'
                            }`}
                          />
                        </button>
                      </div>
                    </th>
                    {formFields.length > 0 && <th className="py-3.5 px-3 font-black whitespace-nowrap w-24 text-center">Custom Form</th>}
                    <th className="py-3.5 px-3 font-black whitespace-nowrap text-center w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {sortedAndFiltered.map((r, idx) => {
                    const isExpanded = expandedRegId === r.id;
                    const teamInfo = teamMap[r.id];

                    return (
                      <React.Fragment key={r.id || idx}>
                        <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-2.5 text-slate-400 font-bold whitespace-nowrap text-center w-10">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-sky-400 text-xs whitespace-nowrap w-40">
                            {r.registration_number || 'N/A'}
                          </td>
                          <td className="py-3 px-3 space-y-0.5 whitespace-nowrap w-48">
                            <div className="font-bold text-slate-900 dark:text-white leading-tight whitespace-nowrap">{r.registrant_name}</div>
                            {r.uid && (
                              <div className="text-[11px] font-mono text-slate-400 font-normal whitespace-nowrap">
                                UID: {r.uid.toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 space-y-0.5 whitespace-nowrap w-52">
                            <div className="text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{r.registrant_email}</div>
                            {r.registrant_phone && (
                              <div className="text-[11px] text-slate-400 whitespace-nowrap">{r.registrant_phone}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-center w-38">
                            {teamInfo ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold whitespace-nowrap">
                                <Users2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Team: {teamInfo.team_name} ({teamInfo.members.length + 1} Members)</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold whitespace-nowrap">
                                Individual
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 space-y-0.5 whitespace-nowrap w-36">
                            <div className="text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                              {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                            {r.submitted_at && (
                              <div className="text-[11px] text-slate-400 font-normal whitespace-nowrap">
                                {new Date(r.submitted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </div>
                            )}
                          </td>
                          {formFields.length > 0 && (
                            <td className="py-3 px-3 whitespace-nowrap w-24 text-center">
                              <button 
                                type="button" 
                                onClick={() => setSelectedAnswersRegId(r.id)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Answers
                              </button>
                            </td>
                          )}
                          <td className="py-3 px-3 text-center whitespace-nowrap w-32">
                            <button
                              type="button"
                              onClick={() => toggleExpand(r.id)}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Details Drawer Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                            <td colSpan={formFields.length > 0 ? 8 : 7} className="p-4 sm:p-5">
                              <div className="space-y-4 text-xs">
                                {/* Section 1: Team & Teammates Details (If Team Registration) */}
                                {teamInfo ? (
                                  <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-slate-800/80 border border-indigo-200/80 dark:border-slate-700/80 space-y-3">
                                    <div className="flex items-center justify-between border-b border-indigo-200 dark:border-slate-700 pb-2">
                                      <div className="font-extrabold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2 flex-wrap">
                                        <Users2 className="w-4 h-4 text-indigo-500" />
                                        <span>Team: {teamInfo.team_name}</span>
                                        {teamInfo.registration_number && (
                                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-sky-400 bg-white/70 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-slate-700">
                                            ID: {teamInfo.registration_number}
                                          </span>
                                        )}
                                      </div>
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                                        {teamInfo.members.length + 1} Total Members
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                      {/* Leader */}
                                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Team Leader</span>
                                          {r.registration_number && (
                                            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-sky-400">
                                              {r.registration_number}
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-bold text-slate-900 dark:text-white">{r.registrant_name}</div>
                                        <div className="text-[11px] text-slate-500">{r.registrant_email}</div>
                                        {r.uid && <div className="text-[10px] font-mono text-slate-400">UID: {r.uid}</div>}
                                      </div>

                                      {/* Teammates */}
                                      {teamInfo.members.map((m, mIdx) => (
                                        <div key={mIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Teammate #{mIdx + 2}</span>
                                            {m.registration_number && (
                                              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-sky-400">
                                                {m.registration_number}
                                              </span>
                                            )}
                                          </div>
                                          <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                                          <div className="text-[11px] text-slate-500">{m.email}</div>
                                          {m.uid && <div className="text-[10px] font-mono text-slate-400">UID: {m.uid}</div>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-500 text-xs">
                                    Individual registration (No team attached).
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Answers Sub-Modal */}
      {selectedAnswersRegId && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAnswersRegId(null)}
          title="Custom Form Answers"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {(() => {
              const r = registrations.find(x => x.id === selectedAnswersRegId);
              const answers = answersMap[selectedAnswersRegId] || {};
              if (!r) return null;

              return (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">Registrant</div>
                    <div className="font-bold text-slate-900 dark:text-white">{r.registrant_name}</div>
                  </div>
                  
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {formFields.map((field) => {
                      const ansVal = answers[field.id] || answers[field.field_key] || 'Not answered';
                      
                      return (
                        <div key={field.id} className="space-y-1">
                          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            {field.label}
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                            {field.field_type === 'url' && ansVal !== 'Not answered' && isValidHttpUrl(ansVal) ? (
                              <a href={ansVal} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-sky-400 hover:underline break-all">
                                {ansVal}
                              </a>
                            ) : (
                              <span className="break-all">{ansVal}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedAnswersRegId(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </Modal>
  );
};
