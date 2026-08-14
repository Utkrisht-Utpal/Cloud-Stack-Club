import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Users2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getEventRegistrationsService, getTeamDetailsForRegistration } from '../../services/registrationForms';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Event, EventRegistration } from '../../types/database';

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

  // Team details cache: reg.id -> team info
  const [teamMap, setTeamMap] = useState<Record<string, { team_name: string; members: any[] }>>({});

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
      const newTeamMap: Record<string, { team_name: string; members: any[] }> = {};
      for (const reg of data) {
        if (reg.team_id) {
          const teamInfo = await getTeamDetailsForRegistration(reg.team_id);
          if (teamInfo) {
            newTeamMap[reg.id] = teamInfo;
          }
        }
      }
      setTeamMap(newTeamMap);
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

  const toggleExpand = (regId: string) => {
    setExpandedRegId((prev) => (prev === regId ? null : regId));
  };

  const handleExportExcel = () => {
    const exportRows: any[] = [];
    let serialNo = 1;

    filtered.forEach((r) => {
      const teamInfo = teamMap[r.id];

      if (teamInfo && teamInfo.members && teamInfo.members.length > 0) {
        // 1. Team Leader Row
        exportRows.push({
          'S.No': serialNo,
          'Registration No': r.registration_number || '',
          'Team Name': teamInfo.team_name || 'N/A',
          'Member Role': 'Team Leader',
          'Member Name': r.registrant_name || '',
          'Email': r.registrant_email || '',
          'Phone': r.registrant_phone || 'N/A',
          'University UID': r.uid || 'N/A',
          'Submitted Date': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'N/A',
        });

        // 2. Teammates Rows
        teamInfo.members.forEach((m, mIdx) => {
          exportRows.push({
            'S.No': '',
            'Registration No': r.registration_number || '',
            'Team Name': teamInfo.team_name || 'N/A',
            'Member Role': `Teammate #${mIdx + 2}`,
            'Member Name': m.name || '',
            'Email': m.email || '',
            'Phone': m.phone || 'N/A',
            'University UID': m.uid || 'N/A',
            'Submitted Date': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'N/A',
          });
        });
      } else {
        // Individual Registrant Row
        exportRows.push({
          'S.No': serialNo,
          'Registration No': r.registration_number || '',
          'Team Name': 'N/A (Individual)',
          'Member Role': 'Individual Registrant',
          'Member Name': r.registrant_name || '',
          'Email': r.registrant_email || '',
          'Phone': r.registrant_phone || 'N/A',
          'University UID': r.uid || 'N/A',
          'Submitted Date': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'N/A',
        });
      }

      // 3. Leave a blank separator row after each registration ends
      exportRows.push({
        'S.No': '',
        'Registration No': '',
        'Team Name': '',
        'Member Role': '',
        'Member Name': '',
        'Email': '',
        'Phone': '',
        'University UID': '',
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
    doc.text(`Total Registrations: ${filtered.length}  •  Export Date: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableRows: string[][] = [];
    let serialNo = 1;

    filtered.forEach((r) => {
      const teamInfo = teamMap[r.id];

      if (teamInfo && teamInfo.members && teamInfo.members.length > 0) {
        // Leader row
        tableRows.push([
          serialNo.toString(),
          r.registration_number || 'N/A',
          teamInfo.team_name || 'N/A',
          'Team Leader',
          r.registrant_name || 'N/A',
          r.registrant_email || 'N/A',
          r.registrant_phone || 'N/A',
          r.uid || 'N/A',
          r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A',
        ]);

        // Teammate rows
        teamInfo.members.forEach((m, mIdx) => {
          tableRows.push([
            '',
            r.registration_number || '',
            teamInfo.team_name || '',
            `Teammate #${mIdx + 2}`,
            m.name || 'N/A',
            m.email || 'N/A',
            m.phone || 'N/A',
            m.uid || 'N/A',
            '',
          ]);
        });
      } else {
        // Individual row
        tableRows.push([
          serialNo.toString(),
          r.registration_number || 'N/A',
          'Individual',
          'Individual',
          r.registrant_name || 'N/A',
          r.registrant_email || 'N/A',
          r.registrant_phone || 'N/A',
          r.uid || 'N/A',
          r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A',
        ]);
      }

      // Blank separator row after each registration
      tableRows.push(['', '', '', '', '', '', '', '', '']);

      serialNo++;
    });

    autoTable(doc, {
      startY: 27,
      head: [['#', 'Reg Number', 'Team Name', 'Role', 'Member Name', 'Email', 'Phone', 'UID', 'Date']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      margin: { top: 27, left: 14, right: 14, bottom: 15 },
    });

    const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '_');
    doc.save(`${cleanTitle}_Registrations_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Event Registrations — ${event.title}`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by registrant name, email, reg no, team name..."
              className="w-full pl-10 pr-4 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={filtered.length === 0}
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
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <Users className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
            <div className="text-sm font-bold text-slate-900 dark:text-white">No Registrations Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No students have registered for "{event.title}" matching your search criteria yet.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-black">#</th>
                    <th className="py-3.5 px-4 font-black">Registration No</th>
                    <th className="py-3.5 px-4 font-black">Student Name</th>
                    <th className="py-3.5 px-4 font-black">Contact Details</th>
                    <th className="py-3.5 px-4 font-black">Type / Team Details</th>
                    <th className="py-3.5 px-4 font-black">Date & Time</th>
                    <th className="py-3.5 px-4 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filtered.map((r, idx) => {
                    const isExpanded = expandedRegId === r.id;
                    const teamInfo = teamMap[r.id];

                    return (
                      <React.Fragment key={r.id || idx}>
                        <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-sky-400 text-xs">
                            {r.registration_number || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {r.registrant_name}
                          </td>
                          <td className="py-3.5 px-4 space-y-0.5">
                            <div className="text-slate-700 dark:text-slate-300 font-medium">{r.registrant_email}</div>
                            {r.registrant_phone && (
                              <div className="text-[11px] text-slate-400">{r.registrant_phone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {teamInfo ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                <Users2 className="w-3.5 h-3.5" />
                                <span>Team: {teamInfo.team_name} ({teamInfo.members.length + 1} Members)</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                                Individual
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 space-y-0.5">
                            <div className="text-slate-700 dark:text-slate-300 font-medium">
                              {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                            {r.submitted_at && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                {new Date(r.submitted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
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
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="space-y-4 text-xs">
                                {/* Section 1: Team & Teammates Details (If Team Registration) */}
                                {teamInfo ? (
                                  <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-slate-800/80 border border-indigo-200/80 dark:border-slate-700/80 space-y-3">
                                    <div className="flex items-center justify-between border-b border-indigo-200 dark:border-slate-700 pb-2">
                                      <div className="font-extrabold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
                                        <Users2 className="w-4 h-4 text-indigo-500" />
                                        <span>Team: {teamInfo.team_name}</span>
                                      </div>
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                                        {teamInfo.members.length + 1} Total Members
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                      {/* Leader */}
                                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 space-y-1">
                                        <div className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Team Leader</div>
                                        <div className="font-bold text-slate-900 dark:text-white">{r.registrant_name}</div>
                                        <div className="text-[11px] text-slate-500">{r.registrant_email}</div>
                                      </div>

                                      {/* Teammates */}
                                      {teamInfo.members.map((m, mIdx) => (
                                        <div key={mIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                                          <div className="text-[10px] font-bold text-slate-400 uppercase">Teammate #{mIdx + 2}</div>
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
    </Modal>
  );
};
