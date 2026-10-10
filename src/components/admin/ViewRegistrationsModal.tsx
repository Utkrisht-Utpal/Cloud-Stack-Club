import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Users2,
  ArrowUp,
  CheckSquare,
  Square,
  Download,
  Check
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
import {
  sanitizeFormulaValue,
  hasEmoji,
  calculateEmojiCellHeight,
  renderEmojiCellToCanvas,
} from '../../utils/exportDirectory';
import { formatOfficialEmail } from '../../utils/formatters';
import type { Event, EventRegistration, EventFormField } from '../../types/database';

interface ExportColumnItem {
  id: string;
  label: string;
  excelHeader: string;
  pdfHeader: string;
  category: 'general' | 'team' | 'personal' | 'academic' | 'custom';
}

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
    order: 'desc',
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

  // Export Customization Modal State
  const [exportModalConfig, setExportModalConfig] = useState<{
    isOpen: boolean;
    type: 'excel' | 'pdf';
  } | null>(null);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && event) {
      setSearchQuery('');
      setExpandedRegId(null);
      setSelectedAnswersRegId(null);
      setExportModalConfig(null);
      setSortConfig({ field: 'date', order: 'desc' });
      loadRegistrations();
    } else if (!isOpen) {
      setSearchQuery('');
      setExpandedRegId(null);
      setSelectedAnswersRegId(null);
      setExportModalConfig(null);
      setSortConfig({ field: 'date', order: 'desc' });
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

  const isCurrentEventTeamBased = Boolean(
    event.supports_teams ||
    registrations.some((r) => {
      const t = teamMap[r.id];
      return Boolean(t && (t.team_name || (t.members && t.members.length > 0)));
    })
  );

  const getAvailableExportColumns = (): ExportColumnItem[] => {
    const cols: ExportColumnItem[] = [
      { id: 'sno', label: 'Serial Number (S.No)', excelHeader: 'S.No', pdfHeader: '#', category: 'general' },
    ];

    if (isCurrentEventTeamBased) {
      cols.push(
        { id: 'team_name', label: 'Team Name', excelHeader: 'Team Name', pdfHeader: 'Team Name', category: 'team' },
        { id: 'team_reg_id', label: 'Team Registration ID', excelHeader: 'Team Reg ID', pdfHeader: 'Team Reg ID', category: 'team' },
        { id: 'member_role', label: 'Member Role (Leader / Teammate)', excelHeader: 'Member Role', pdfHeader: 'Role', category: 'team' }
      );
    }

    cols.push(
      { id: 'registration_number', label: 'Registration Number', excelHeader: 'Registration No', pdfHeader: 'Reg Number', category: 'general' },
      { id: 'name', label: isCurrentEventTeamBased ? 'Member Name' : 'Participant Name', excelHeader: isCurrentEventTeamBased ? 'Member Name' : 'Participant Name', pdfHeader: isCurrentEventTeamBased ? 'Member Name' : 'Participant Name', category: 'personal' },
      { id: 'email', label: 'Email Address', excelHeader: 'Email', pdfHeader: 'Email', category: 'personal' },
      { id: 'official_email', label: 'Official Email (UID@cuchd.in)', excelHeader: 'Official Email', pdfHeader: 'Official Email', category: 'personal' },
      { id: 'phone', label: 'Phone Number', excelHeader: 'Phone', pdfHeader: 'Phone', category: 'personal' },
      { id: 'uid', label: 'University UID', excelHeader: 'University UID', pdfHeader: 'UID', category: 'academic' },
      { id: 'department', label: 'Department / Branch', excelHeader: 'Department', pdfHeader: 'Dept', category: 'academic' },
      { id: 'year', label: 'Academic Year', excelHeader: 'Year', pdfHeader: 'Year', category: 'academic' },
      { id: 'section', label: 'Section / Group', excelHeader: 'Section', pdfHeader: 'Sec', category: 'academic' }
    );

    if (formFields && formFields.length > 0) {
      formFields.forEach((field) => {
        cols.push({
          id: `custom_${field.id}`,
          label: field.label,
          excelHeader: field.label,
          pdfHeader: field.label.length > 20 ? `${field.label.slice(0, 18)}...` : field.label,
          category: 'custom',
        });
      });
    }

    cols.push({
      id: 'submitted_date',
      label: 'Submission Date & Time',
      excelHeader: 'Submitted Date',
      pdfHeader: 'Date',
      category: 'general',
    });

    return cols;
  };

  const filtered = registrations.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const teamInfo = teamMap[r.id];
    const leaderUid = (r.uid || '').toLowerCase();
    const leaderEmail = (r.registrant_email || '').toLowerCase();
    const leaderName = (r.registrant_name || '').toLowerCase();
    const leaderPhone = (r.registrant_phone || '').toLowerCase();
    const leaderRegNum = (r.registration_number || '').toLowerCase();
    const leaderDept = (r.department || '').toLowerCase();
    const leaderYear = (r.year || '').toLowerCase();
    const leaderSection = (r.section || '').toLowerCase();
    const teamName = (teamInfo?.team_name || '').toLowerCase();
    const teamRegNum = (teamInfo?.registration_number || '').toLowerCase();

    // Check primary registrant / team leader
    if (
      leaderName.includes(q) ||
      leaderEmail.includes(q) ||
      leaderUid.includes(q) ||
      leaderPhone.includes(q) ||
      leaderRegNum.includes(q) ||
      leaderDept.includes(q) ||
      leaderYear.includes(q) ||
      leaderSection.includes(q) ||
      teamName.includes(q) ||
      teamRegNum.includes(q)
    ) {
      return true;
    }

    // Check all team members
    if (teamInfo && Array.isArray(teamInfo.members)) {
      const matchedTeammate = teamInfo.members.some((m) => {
        const mName = (m.name || '').toLowerCase();
        const mEmail = (m.email || '').toLowerCase();
        const mUid = (m.uid || '').toLowerCase();
        const mPhone = (m.phone || '').toLowerCase();
        const mRegNum = (m.registration_number || '').toLowerCase();
        const mDept = (m.department || '').toLowerCase();
        const mYear = (m.year || '').toLowerCase();
        const mSection = (m.section || '').toLowerCase();

        return (
          mName.includes(q) ||
          mEmail.includes(q) ||
          mUid.includes(q) ||
          mPhone.includes(q) ||
          mRegNum.includes(q) ||
          mDept.includes(q) ||
          mYear.includes(q) ||
          mSection.includes(q)
        );
      });

      if (matchedTeammate) return true;
    }

    // Check custom form answers
    const regAnswers = answersMap[r.id];
    if (regAnswers && typeof regAnswers === 'object') {
      const hasMatchingAnswer = Object.values(regAnswers).some((ans) =>
        String(ans || '').toLowerCase().includes(q)
      );
      if (hasMatchingAnswer) return true;
    }

    return false;
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

  const handleOpenExportModal = (type: 'excel' | 'pdf') => {
    const allCols = getAvailableExportColumns();
    setSelectedColumnKeys(allCols.map((c) => c.id));
    setExportModalConfig({ isOpen: true, type });
  };

  const executeExportExcel = (selectedKeys: string[]) => {
    if (!event) return;

    const availableCols = getAvailableExportColumns().filter((c) => selectedKeys.includes(c.id));
    if (availableCols.length === 0) return;

    const isTeamEvent = isCurrentEventTeamBased;
    const exportRows: any[] = [];
    let serialNo = 1;

    sortedAndFiltered.forEach((r, idx) => {
      const teamInfo = teamMap[r.id];
      const regAnswers = answersMap[r.id] || {};

      const buildExcelRow = (
        isTeammate: boolean,
        memberObj?: any,
        mRole?: string,
        tName?: string,
        tRegId?: string
      ) => {
        const row: Record<string, any> = {};
        availableCols.forEach((col) => {
          if (col.id === 'sno') {
            row[col.excelHeader] = isTeammate ? '' : serialNo;
          } else if (col.id === 'team_name') {
            row[col.excelHeader] = sanitizeFormulaValue(tName || '');
          } else if (col.id === 'team_reg_id') {
            row[col.excelHeader] = sanitizeFormulaValue(tRegId || '');
          } else if (col.id === 'member_role') {
            row[col.excelHeader] = mRole || '';
          } else if (col.id === 'registration_number') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.registration_number : r.registration_number) || ''
            );
          } else if (col.id === 'name') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.name : r.registrant_name) || ''
            );
          } else if (col.id === 'email') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.email : r.registrant_email) || ''
            );
          } else if (col.id === 'official_email') {
            row[col.excelHeader] = sanitizeFormulaValue(
              formatOfficialEmail(isTeammate ? memberObj?.uid : r.uid)
            );
          } else if (col.id === 'phone') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.phone : r.registrant_phone) || ''
            );
          } else if (col.id === 'uid') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.uid : r.uid) || ''
            );
          } else if (col.id === 'department') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.department : r.department) || ''
            );
          } else if (col.id === 'year') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.year : r.year) || ''
            );
          } else if (col.id === 'section') {
            row[col.excelHeader] = sanitizeFormulaValue(
              (isTeammate ? memberObj?.section : r.section) || ''
            );
          } else if (col.id.startsWith('custom_')) {
            if (isTeammate) {
              row[col.excelHeader] = '';
            } else {
              const fieldId = col.id.replace('custom_', '');
              const field = formFields.find((f) => f.id === fieldId);
              const ansVal = regAnswers[fieldId] || (field ? regAnswers[field.field_key] : '') || '';
              row[col.excelHeader] = sanitizeFormulaValue(ansVal);
            }
          } else if (col.id === 'submitted_date') {
            row[col.excelHeader] =
              !isTeammate && r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-GB') : '';
          }
        });
        return row;
      };

      if (isTeamEvent) {
        const hasTeammates = Boolean(teamInfo && teamInfo.members && teamInfo.members.length > 0);
        const teamName = teamInfo?.team_name || (hasTeammates ? 'Unnamed Team' : 'Solo Participant');
        const teamRegId = teamInfo?.registration_number || r.registration_number || '';

        // Leader row
        exportRows.push(
          buildExcelRow(false, null, hasTeammates ? 'Team Leader' : 'Solo Participant', teamName, teamRegId)
        );

        // Teammates rows
        if (hasTeammates && teamInfo && teamInfo.members) {
          teamInfo.members.forEach((m, mIdx) => {
            exportRows.push(buildExcelRow(true, m, `Teammate #${mIdx + 2}`, teamName, teamRegId));
          });
        }

        // Spacer row between distinct teams
        if (idx < sortedAndFiltered.length - 1) {
          const emptyRow: Record<string, string> = {};
          availableCols.forEach((col) => {
            emptyRow[col.excelHeader] = '';
          });
          exportRows.push(emptyRow);
        }
      } else {
        // Individual Event
        exportRows.push(buildExcelRow(false, null, '', '', ''));
      }

      serialNo++;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    if (exportRows.length > 0) {
      const colKeys = Object.keys(exportRows[0]);
      worksheet['!cols'] = colKeys.map((key) => {
        let maxLen = key.length;
        exportRows.forEach((row) => {
          const val = row[key];
          if (val !== undefined && val !== null) {
            const strVal = String(val).trim();
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        });
        const minW = key === 'S.No' ? 6 : Math.max(key.length + 3, 14);
        return { wch: Math.min(Math.max(maxLen + 3, minW), 55) };
      });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '_');
    XLSX.writeFile(workbook, `${cleanTitle}_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`);
    setExportModalConfig(null);
  };

  const executeExportPdf = (selectedKeys: string[]) => {
    if (!event) return;

    const availableCols = getAvailableExportColumns().filter((c) => selectedKeys.includes(c.id));
    if (availableCols.length === 0) return;

    const isTeamEvent = isCurrentEventTeamBased;
    const isLandscape = availableCols.length > 6;
    const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`Event Registrations — ${event.title}`, 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);

    let totalHeadcount = 0;
    sortedAndFiltered.forEach((r) => {
      totalHeadcount += 1;
      const t = teamMap[r.id];
      if (t && t.members) {
        totalHeadcount += t.members.length;
      }
    });

    const subTitle = isTeamEvent
      ? `Total Teams: ${sortedAndFiltered.length}  •  Total Headcount: ${totalHeadcount}  •  Export Date: ${new Date().toLocaleDateString('en-GB')}`
      : `Total Registrations: ${sortedAndFiltered.length}  •  Export Date: ${new Date().toLocaleDateString('en-GB')}`;

    doc.text(subTitle, 14, 22);

    const pdfHeaders: string[] = availableCols.map((c) => c.pdfHeader);
    const tableRows: string[][] = [];
    let serialNo = 1;

    sortedAndFiltered.forEach((r, idx) => {
      const teamInfo = teamMap[r.id];
      const regAnswers = answersMap[r.id] || {};

      const buildPdfRow = (
        isTeammate: boolean,
        memberObj?: any,
        mRole?: string,
        tName?: string,
        tRegId?: string
      ) => {
        return availableCols.map((col) => {
          if (col.id === 'sno') {
            return isTeammate ? '' : serialNo.toString();
          } else if (col.id === 'team_name') {
            return tName || '';
          } else if (col.id === 'team_reg_id') {
            return tRegId || '';
          } else if (col.id === 'member_role') {
            return mRole || '';
          } else if (col.id === 'registration_number') {
            return (isTeammate ? memberObj?.registration_number : r.registration_number) || '';
          } else if (col.id === 'name') {
            return (isTeammate ? memberObj?.name : r.registrant_name) || '';
          } else if (col.id === 'email') {
            return (isTeammate ? memberObj?.email : r.registrant_email) || '';
          } else if (col.id === 'official_email') {
            return formatOfficialEmail(isTeammate ? memberObj?.uid : r.uid);
          } else if (col.id === 'phone') {
            return (isTeammate ? memberObj?.phone : r.registrant_phone) || '';
          } else if (col.id === 'uid') {
            return (isTeammate ? memberObj?.uid : r.uid) || '';
          } else if (col.id === 'department') {
            return (isTeammate ? memberObj?.department : r.department) || '';
          } else if (col.id === 'year') {
            return (isTeammate ? memberObj?.year : r.year) || '';
          } else if (col.id === 'section') {
            return (isTeammate ? memberObj?.section : r.section) || '';
          } else if (col.id.startsWith('custom_')) {
            if (isTeammate) return '';
            const fieldId = col.id.replace('custom_', '');
            const field = formFields.find((f) => f.id === fieldId);
            return regAnswers[fieldId] || (field ? regAnswers[field.field_key] : '') || '';
          } else if (col.id === 'submitted_date') {
            return !isTeammate && r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : '';
          }
          return '';
        });
      };

      if (isTeamEvent) {
        const hasTeammates = Boolean(teamInfo && teamInfo.members && teamInfo.members.length > 0);
        const teamName = teamInfo?.team_name || (hasTeammates ? 'Unnamed Team' : 'Solo');
        const teamRegId = teamInfo?.registration_number || r.registration_number || '';

        // Leader row
        tableRows.push(buildPdfRow(false, null, hasTeammates ? 'Team Leader' : 'Solo', teamName, teamRegId));

        // Teammates rows
        if (hasTeammates && teamInfo && teamInfo.members) {
          teamInfo.members.forEach((m, mIdx) => {
            tableRows.push(buildPdfRow(true, m, `Teammate #${mIdx + 2}`, teamName, teamRegId));
          });
        }

        // Spacer row between different teams
        if (idx < sortedAndFiltered.length - 1) {
          tableRows.push(availableCols.map(() => ''));
        }
      } else {
        // Individual Event
        tableRows.push(buildPdfRow(false, null, '', '', ''));
      }

      serialNo++;
    });

    autoTable(doc, {
      startY: 27,
      head: [pdfHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      didParseCell: (data: any) => {
        if (isTeamEvent && data.row.raw && Array.isArray(data.row.raw)) {
          const isSpacer = data.row.raw.every((c: any) => !c || c === '');
          if (isSpacer) {
            data.cell.styles.fillColor = [248, 250, 252];
            data.cell.styles.minCellHeight = 3;
            return;
          }
        }
        if (data.section === 'body') {
          const rawVal = data.cell.raw;
          if (hasEmoji(rawVal)) {
            (data.cell as any)._rawEmoji = String(rawVal);
            const colWidth = data.column.width || (data.cell.styles as any).cellWidth || 30;
            const minH = calculateEmojiCellHeight(String(rawVal), typeof colWidth === 'number' ? colWidth : 30, 7.5);
            data.cell.styles.minCellHeight = Math.max(data.cell.styles.minCellHeight || 0, minH);
            data.cell.text = [];
          }
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && (data.cell as any)._rawEmoji) {
          const rawVal = (data.cell as any)._rawEmoji;
          const imgData = renderEmojiCellToCanvas(rawVal, data.cell.width, data.cell.height, {
            fontSizePt: 7.5,
            textColor: '#1e293b',
            paddingMm: 1.5,
          });
          if (imgData) {
            doc.addImage(imgData, 'PNG', data.cell.x, data.cell.y, data.cell.width, data.cell.height);
          }
        }
      },
      margin: { top: 27, left: 10, right: 10, bottom: 15 },
    });

    const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '_');
    doc.save(`${cleanTitle}_Registrations_${new Date().toISOString().split('T')[0]}.pdf`);
    setExportModalConfig(null);
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
              placeholder="Search by name, email, UID, phone, reg no, department, team..."
              className="search-input w-full pl-10 pr-4 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-0 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenExportModal('excel')}
              disabled={sortedAndFiltered.length === 0}
              className="h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenExportModal('pdf')}
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
                                <span className="font-bold text-slate-600 dark:text-slate-300">UID:</span> {r.uid.toUpperCase()}
                              </div>
                            )}
                            {(r.department || r.year) && (
                              <div className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold whitespace-nowrap">
                                {[r.department, r.year].filter(Boolean).join(' • ')}
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
                                        {r.uid && (
                                          <div className="text-[10px] font-mono text-slate-400">
                                            <span className="font-bold text-slate-600 dark:text-slate-300">UID:</span> {r.uid}
                                          </div>
                                        )}
                                        {r.section && (
                                          <div className="text-[10px] font-mono text-slate-400">
                                            <span className="font-bold text-slate-600 dark:text-slate-300">Section:</span> {r.section}
                                          </div>
                                        )}
                                        {(r.department || r.year) && (
                                          <div className="text-[10px] text-slate-500 font-medium">
                                            {[r.department, r.year].filter(Boolean).join(' • ')}
                                          </div>
                                        )}
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
                                          {m.uid && (
                                            <div className="text-[10px] font-mono text-slate-400">
                                              <span className="font-bold text-slate-600 dark:text-slate-300">UID:</span> {m.uid}
                                            </div>
                                          )}
                                          {m.section && (
                                            <div className="text-[10px] font-mono text-slate-400">
                                              <span className="font-bold text-slate-600 dark:text-slate-300">Section:</span> {m.section}
                                            </div>
                                          )}
                                          {(m.department || m.year) && (
                                            <div className="text-[10px] text-slate-500 font-medium">
                                              {[m.department, m.year].filter(Boolean).join(' • ')}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs flex items-center justify-between flex-wrap gap-2">
                                    <span>Individual registration (No team attached).</span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {r.section && (
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                          <strong className="font-bold">Sec:</strong> {r.section}
                                        </span>
                                      )}
                                      {(r.department || r.year) && (
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                          {[r.department, r.year].filter(Boolean).join(' • ')}
                                        </span>
                                      )}
                                    </div>
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

      {/* Export Columns Customization Modal */}
      {exportModalConfig && (
        <Modal
          isOpen={true}
          onClose={() => setExportModalConfig(null)}
          title={exportModalConfig.type === 'excel' ? 'Export to Excel — Select Columns' : 'Export to PDF — Select Columns'}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Description & Selection Counter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                  {exportModalConfig.type === 'excel' ? (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                  <span>Choose Columns for {exportModalConfig.type.toUpperCase()} Export</span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Only selected columns will be included in the downloaded document.
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    const allCols = getAvailableExportColumns();
                    setSelectedColumnKeys(allCols.map((c) => c.id));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedColumnKeys([])}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Deselect All</span>
                </button>
              </div>
            </div>

            {/* Columns Categorized Tiles */}
            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              {(() => {
                const availableCols = getAvailableExportColumns();
                const categories: { key: ExportColumnItem['category']; label: string }[] = [
                  { key: 'general', label: 'General & Identification' },
                  ...(isCurrentEventTeamBased ? [{ key: 'team' as const, label: 'Team Details' }] : []),
                  { key: 'personal', label: 'Participant Information' },
                  { key: 'academic', label: 'Academic & Branch Details' },
                  ...(formFields.length > 0 ? [{ key: 'custom' as const, label: 'Custom Form Fields' }] : []),
                ];

                return categories.map((cat) => {
                  const catCols = availableCols.filter((c) => c.category === cat.key);
                  if (catCols.length === 0) return null;

                  const allCatSelected = catCols.every((c) => selectedColumnKeys.includes(c.id));

                  return (
                    <div key={cat.key} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10.5px]">
                          {cat.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (allCatSelected) {
                              setSelectedColumnKeys((prev) => prev.filter((id) => !catCols.some((c) => c.id === id)));
                            } else {
                              setSelectedColumnKeys((prev) => Array.from(new Set([...prev, ...catCols.map((c) => c.id)])));
                            }
                          }}
                          className="text-[10px] font-semibold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          {allCatSelected ? 'Uncheck category' : 'Check category'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catCols.map((col) => {
                          const isChecked = selectedColumnKeys.includes(col.id);

                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => {
                                setSelectedColumnKeys((prev) =>
                                  prev.includes(col.id) ? prev.filter((id) => id !== col.id) : [...prev, col.id]
                                );
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                                isChecked
                                  ? exportModalConfig.type === 'excel'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 text-slate-900 dark:text-white shadow-sm'
                                    : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800/60 text-slate-900 dark:text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                    isChecked
                                      ? exportModalConfig.type === 'excel'
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-red-600 border-red-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-transparent'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={`truncate text-xs ${isChecked ? 'font-bold' : 'font-medium'}`}>
                                  {col.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3 gap-3">
              <div className="text-[11px] font-semibold text-slate-500">
                <span className="font-bold text-slate-900 dark:text-white">{selectedColumnKeys.length}</span> of{' '}
                {getAvailableExportColumns().length} columns selected
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModalConfig(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (exportModalConfig.type === 'excel') {
                      executeExportExcel(selectedColumnKeys);
                    } else {
                      executeExportPdf(selectedColumnKeys);
                    }
                  }}
                  disabled={selectedColumnKeys.length === 0}
                  className={`px-4 py-2 rounded-xl text-white font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-xs ${
                    exportModalConfig.type === 'excel'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {exportModalConfig.type === 'excel' ? 'Excel (.xlsx)' : 'PDF (.pdf)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
