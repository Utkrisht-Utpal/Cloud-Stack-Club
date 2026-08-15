import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Member, ContactFeedback } from '../types/database';

export const exportMembersToExcel = (
  members: Member[],
  filterType: 'all' | 'members' | 'core',
  _searchQuery: string
) => {
  const data = members.map((m, index) => ({
    'S.No': index + 1,
    'Member Name': m.name || '',
    'Email': m.email || '',
    'Mobile No': m.phone || 'N/A',
    'University UID': m.uid || 'N/A',
    'Registration ID': m.registration_id || 'N/A',
    'Department': m.department || 'N/A',
    'Year': m.year || 'N/A',
    'Role / Core Status': m.is_core_member ? (m.role?.name || 'Core Member') : 'General Member',
    'Status': m.status || 'active',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for optimal Excel readability
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Name
    { wch: 28 }, // Email
    { wch: 15 }, // Mobile
    { wch: 15 }, // UID
    { wch: 16 }, // Reg ID
    { wch: 20 }, // Dept
    { wch: 10 }, // Year
    { wch: 22 }, // Role
    { wch: 12 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Members Directory');

  const filterLabel = filterType === 'core' ? 'Core_Team' : filterType === 'members' ? 'General_Members' : 'All_Members';
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Cloud_Stack_Club_Member_Directory_${filterLabel}_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
};

export const exportMembersToPdf = (
  members: Member[],
  filterType: 'all' | 'members' | 'core',
  searchQuery: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Cloud Stack Club — Member Directory', 14, 15);

  // Subtitle / Filter Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);

  const filterText = filterType === 'core' ? 'Core Members' : filterType === 'members' ? 'General Members' : 'All Members';
  const searchNote = searchQuery ? ` | Search: "${searchQuery}"` : '';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  doc.text(`Filter: ${filterText} (${members.length} total)${searchNote}  •  Exported on: ${dateStr}`, 14, 22);

  // Table Data mapping
  const tableRows = members.map((m, index) => [
    (index + 1).toString(),
    m.name || 'N/A',
    m.email || 'N/A',
    m.phone || 'N/A',
    m.uid || 'N/A',
    m.department || 'N/A',
    m.year || 'N/A',
    m.is_core_member ? (m.role?.name || 'Core Member') : 'Member',
  ]);

  autoTable(doc, {
    startY: 27,
    head: [['#', 'Member Name', 'Email', 'Mobile No', 'University UID', 'Department', 'Year', 'Role / Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Blue 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 27, left: 14, right: 14, bottom: 16 },
    didDrawPage: (data: any) => {
      const totalPages = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Chandigarh University  •  Cloud Stack Club`, 14, doc.internal.pageSize.height - 7);
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 7);
    },
  });

  const filterLabel = filterType === 'core' ? 'Core_Team' : filterType === 'members' ? 'General_Members' : 'All_Members';
  const fileDate = new Date().toISOString().split('T')[0];
  const fileName = `Cloud_Stack_Club_Member_Directory_${filterLabel}_${fileDate}.pdf`;

  doc.save(fileName);
};

export const exportFeedbacksToPdf = (
  feedbacks: ContactFeedback[],
  filterType: string,
  searchQuery: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Cloud Stack Club — Contact & Feedbacks Directory', 14, 15);

  // Subtitle / Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);

  const filterText = filterType.replace('_', ' ').toUpperCase();
  const searchNote = searchQuery ? ` | Search: "${searchQuery}"` : '';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  doc.text(`Filter: ${filterText} (${feedbacks.length} total)${searchNote}  •  Exported on: ${dateStr}`, 14, 22);

  // Table Data mapping
  const tableRows = feedbacks.map((f, index) => [
    (index + 1).toString(),
    f.name || 'N/A',
    f.email || 'N/A',
    f.message || 'N/A',
    (f.status || 'pending').toUpperCase(),
    f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A',
  ]);

  autoTable(doc, {
    startY: 27,
    head: [['#', 'Sender Name', 'Email', 'Message / Feedback Query', 'Status', 'Received Date']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 40 },
      2: { cellWidth: 55 },
      3: { cellWidth: 110 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 27, left: 14, right: 14, bottom: 16 },
    didDrawPage: (data: any) => {
      const totalPages = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Chandigarh University  •  Cloud Stack Club`, 14, doc.internal.pageSize.height - 7);
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 7);
    },
  });

  const cleanFilter = filterType.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Cloud_Stack_Club_Feedbacks_${cleanFilter}_${new Date().toISOString().split('T')[0]}.pdf`);
};
