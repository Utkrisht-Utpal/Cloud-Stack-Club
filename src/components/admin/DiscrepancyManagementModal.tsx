import React, { useState, useEffect } from 'react';
import {
  Search,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Mail,
  Phone,
  Trash2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { CustomSelect } from '../ui/CustomSelect';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeFormulaValue } from '../../utils/exportDirectory';
import {
  getAllDiscrepancies,
  updateDiscrepancyStatus,
  deleteDiscrepancy,
  type Discrepancy,
  type DiscrepancyStatus,
} from '../../services/discrepancies';

interface DiscrepancyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  DiscrepancyStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  in_review: {
    label: 'In Review',
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-sky-400',
    border: 'border-blue-500/30',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  archived: {
    label: 'Archived',
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
  dismissed: {
    label: 'Archived',
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
};

export const DiscrepancyManagementModal: React.FC<DiscrepancyManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [submissions, setSubmissions] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DiscrepancyStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<Discrepancy | null>(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState<Record<string, string>>({});

  const loadSubmissions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getAllDiscrepancies();
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load discrepancy submissions:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSubmissions(submissions.length === 0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      // Silently sync in background without unmounting the table or toggling loading state
      getAllDiscrepancies()
        .then((data) => setSubmissions(data))
        .catch(() => {});
    };
    window.addEventListener('csc-discrepancy-updated', handleUpdate);
    return () => window.removeEventListener('csc-discrepancy-updated', handleUpdate);
  }, []);

  const handleStatusChange = async (id: string, newStatus: DiscrepancyStatus) => {
    const notes = adminNotesDraft[id];
    setSubmissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    try {
      await updateDiscrepancyStatus(id, newStatus, notes);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSaveNotes = async (id: string) => {
    const notes = adminNotesDraft[id];
    const ticket = submissions.find((s) => s.id === id);
    if (ticket) {
      await updateDiscrepancyStatus(id, ticket.status, notes);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, admin_notes: notes } : item))
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTicket) return;
    const targetId = deletingTicket.id;
    setSubmissions((prev) => prev.filter((item) => item.id !== targetId));
    setDeletingTicket(null);
    await deleteDiscrepancy(targetId);
  };

  // Search & Status Filtering
  const filtered = submissions.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      item.ticket_number.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      (item.uid && item.uid.toLowerCase().includes(q)) ||
      item.department.toLowerCase().includes(q) ||
      item.year_of_study.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  // Export to Excel
  const handleExportExcel = () => {
    if (filtered.length === 0) return;

    const exportRows = filtered.map((r, idx) => ({
      '#': idx + 1,
      'Ticket Number': sanitizeFormulaValue(r.ticket_number),
      'Student Name': sanitizeFormulaValue(r.name),
      'UID': sanitizeFormulaValue(r.uid || 'N/A'),
      'Email Address': sanitizeFormulaValue(r.email),
      'Phone Number': sanitizeFormulaValue(r.phone),
      'Department / Branch': sanitizeFormulaValue(r.department),
      'Year of Study': sanitizeFormulaValue(r.year_of_study),
      'Issue Description': sanitizeFormulaValue(r.description || 'N/A'),
      'Status': sanitizeFormulaValue(r.status.toUpperCase()),
      'Admin Notes': sanitizeFormulaValue(r.admin_notes || ''),
      'Submitted Date': new Date(r.created_at).toLocaleDateString('en-GB'),
      'Submitted Time': new Date(r.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Discrepancies');
    XLSX.writeFile(
      workbook,
      `CloudStack_Discrepancies_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // Export to PDF
  const handleExportPdf = () => {
    if (filtered.length === 0) return;

    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('Cloud Stack Club — Discrepancy & Query Submissions', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Exported on: ${new Date().toLocaleString()} | Total Records: ${filtered.length}`, 14, 21);

    const tableData = filtered.map((r, idx) => [
      idx + 1,
      r.ticket_number,
      `${r.name}\n${r.uid ? `UID: ${r.uid}` : ''}`,
      `${r.email}\n${r.phone}`,
      `${r.department}\n(${r.year_of_study})`,
      new Date(r.created_at).toLocaleString('en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      r.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['#', 'Ticket No', 'Student Name', 'Contact Details', 'Department & Year', 'Date & Time', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save(`CloudStack_Discrepancies_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Discrepancy Submissions"
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
          {/* Controls Header (Search + Export Buttons matching ViewRegistrationsModal) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, email, reg no, team name..."
                className="w-full pl-10 pr-4 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Quick Filter Bar */}
          <div className="flex items-center gap-2 pb-1 overflow-x-auto text-xs font-bold">
            {(['all', 'pending', 'in_review', 'resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300'
                }`}
              >
                {st === 'all' ? 'All Records' : STATUS_CONFIG[st].label}
                <span className="ml-1.5 opacity-70">
                  (
                  {st === 'all'
                    ? submissions.length
                    : submissions.filter((s) => s.status === st).length}
                  )
                </span>
              </button>
            ))}
          </div>

          {/* Submissions List Table */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 font-semibold">
              Loading student discrepancy submissions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
              <HelpCircle className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                No Submissions Found
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No students have submitted queries matching your search criteria yet.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {/* After 4 entries, the table body becomes smoothly scrollable with custom-scrollbar */}
              <div
                className={`overflow-x-auto ${
                  filtered.length > 4 ? 'max-h-[300px] overflow-y-auto custom-scrollbar' : ''
                }`}
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] shadow-sm">
                    <tr>
                      <th className="py-3.5 px-4 font-black">#</th>
                      <th className="py-3.5 px-4 font-black">Registration No</th>
                      <th className="py-3.5 px-4 font-black">Student Name</th>
                      <th className="py-3.5 px-4 font-black">Contact Details</th>
                      <th className="py-3.5 px-4 font-black">Department / Year</th>
                      <th className="py-3.5 px-4 font-black">Date & Time</th>
                      <th className="py-3.5 px-4 font-black text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filtered.map((r, idx) => {
                      const isExpanded = expandedId === r.id;
                      const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;

                      return (
                        <React.Fragment key={r.id}>
                          <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-sky-400 text-xs">
                              {r.ticket_number}
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                {r.name}
                              </div>
                              {r.uid ? (
                                <div className="text-[11px] font-mono text-slate-400 font-normal whitespace-nowrap">
                                  UID: {r.uid}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400">UID: Not provided</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <div className="text-slate-700 dark:text-slate-300 font-medium">
                                {r.email}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {r.phone}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 space-y-1">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {r.department}
                              </div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                                {r.year_of_study}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              <div className="text-slate-700 dark:text-slate-300 font-medium">
                                {new Date(r.created_at).toLocaleDateString('en-GB')}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal">
                                {new Date(r.created_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-bold transition-all cursor-pointer shadow-sm"
                              >
                                <span>View Details</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details Drawer */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 dark:bg-slate-900/90">
                              <td colSpan={7} className="p-4 sm:p-5">
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                                  {/* Top row: Status Selector + Quick Contact */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Status:
                                      </span>
                                      <div className="w-[145px]">
                                        <CustomSelect
                                          value={r.status}
                                          onChange={(val) =>
                                            handleStatusChange(
                                              r.id,
                                              val as DiscrepancyStatus
                                            )
                                          }
                                          options={[
                                            { value: 'pending', label: '⏳ Pending' },
                                            { value: 'in_review', label: '🔍 In Review' },
                                            { value: 'resolved', label: '✅ Resolved' },
                                            { value: 'archived', label: '📁 Archived' },
                                          ]}
                                          triggerClassName={`w-full h-8 px-3 rounded-xl text-xs font-bold border flex items-center justify-between gap-1.5 transition-all cursor-pointer whitespace-nowrap ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                                        />
                                      </div>
                                    </div>

                                    {/* Direct WhatsApp & Email Buttons */}
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={`https://wa.me/91${r.phone}?text=${encodeURIComponent(
                                          `Hello ${r.name}, this is regarding your CloudStack Club discrepancy query (Ticket: ${r.ticket_number}).`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                      >
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>WhatsApp</span>
                                      </a>
                                      <a
                                        href={`mailto:${r.email}?subject=${encodeURIComponent(
                                          `CloudStack Club Query Resolution — ${r.ticket_number}`
                                        )}`}
                                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                      >
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>Send Email</span>
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => setDeletingTicket(r)}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer ml-1"
                                        title="Delete Submission"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Query Description */}
                                  <div>
                                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                      Student Query / Problem Statement:
                                    </div>
                                    <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                                      {r.description || 'No detailed remarks provided by student.'}
                                    </p>
                                  </div>

                                  {/* Admin Notes */}
                                  <div>
                                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                      Internal Coordinator Notes:
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        placeholder="Add internal remarks or coordinator follow-up notes..."
                                        value={
                                          adminNotesDraft[r.id] !== undefined
                                            ? adminNotesDraft[r.id]
                                            : r.admin_notes || ''
                                        }
                                        onChange={(e) =>
                                          setAdminNotesDraft((prev) => ({
                                            ...prev,
                                            [r.id]: e.target.value,
                                          }))
                                        }
                                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveNotes(r.id)}
                                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingTicket)}
        onClose={() => setDeletingTicket(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Discrepancy Record"
        message={`Are you sure you want to delete the discrepancy record for "${deletingTicket?.name}" (${deletingTicket?.ticket_number})? This action cannot be undone.`}
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
};
