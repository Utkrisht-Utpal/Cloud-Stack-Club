import React, { useState, useEffect } from 'react';
import { Users, Search, FileSpreadsheet, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getEventRegistrationsService } from '../../services/registrationForms';
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
    } catch (err) {
      console.error('Error loading registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !event) return null;

  const filtered = registrations.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.registrant_name && r.registrant_name.toLowerCase().includes(q)) ||
      (r.registrant_email && r.registrant_email.toLowerCase().includes(q)) ||
      (r.registration_number && r.registration_number.toLowerCase().includes(q))
    );
  });

  const handleExportExcel = () => {
    const exportData = filtered.map((r, index) => ({
      'S.No': index + 1,
      'Registration No': r.registration_number || '',
      'Registrant Name': r.registrant_name || '',
      'Email': r.registrant_email || '',
      'Phone': r.registrant_phone || 'N/A',
      'Status': r.status || 'registered',
      'Submitted At': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
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
    doc.text(`Total Registered: ${filtered.length}  •  Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableRows = filtered.map((r, index) => [
      (index + 1).toString(),
      r.registration_number || 'N/A',
      r.registrant_name || 'N/A',
      r.registrant_email || 'N/A',
      r.registrant_phone || 'N/A',
      r.status || 'registered',
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A',
    ]);

    autoTable(doc, {
      startY: 27,
      head: [['#', 'Reg Number', 'Registrant Name', 'Email', 'Phone', 'Status', 'Date']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5 },
      margin: { top: 27, left: 14, right: 14, bottom: 15 },
    });

    const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '_');
    doc.save(`${cleanTitle}_Registrations_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Event Registrations — ${event.title}`}>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registrant by name, email, reg no..."
              className="w-full pl-9 pr-3 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="h-10 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={filtered.length === 0}
              className="h-10 px-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Registrations List Table */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading event registrations...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No Registrations Found</div>
            <p className="text-[11px] text-slate-500">No students have registered for this event yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5 font-bold">#</th>
                  <th className="py-3 px-3.5 font-bold">Reg Number</th>
                  <th className="py-3 px-3.5 font-bold">Student Name</th>
                  <th className="py-3 px-3.5 font-bold">Email</th>
                  <th className="py-3 px-3.5 font-bold">Phone</th>
                  <th className="py-3 px-3.5 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filtered.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3.5 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3.5 font-mono text-blue-600 dark:text-sky-400 font-bold">
                      {r.registration_number}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">
                      {r.registrant_name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">{r.registrant_email}</td>
                    <td className="py-3 px-3.5 text-slate-500">{r.registrant_phone || 'N/A'}</td>
                    <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
