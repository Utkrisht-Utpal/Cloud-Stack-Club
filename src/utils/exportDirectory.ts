import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatOfficialEmail } from './formatters';
import type { Member, ContactFeedback, EventFeedback } from '../types/database';

/**
 * Sanitizes cell values to neutralize CSV / Excel Formula Injection (CWE-1236).
 * Prepends a single quote to prevent execution of formulas starting with =, +, -, @, \t, or \r.
 */
export const sanitizeFormulaValue = (value: any): any => {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return value;
};

/**
 * Map of popular Unicode emojis to clean, readable text equivalents.
 * Prevents jsPDF standard WinAnsi font from rendering corrupted/mojibake characters (e.g. ðŸš€, â­).
 */
const EMOJI_TEXT_MAP: Record<string, string> = {
  // Stars & Ratings
  '⭐': '[Star]',
  '🌟': '[Star]',
  '✨': '[Sparkles]',
  '🌠': '[Star]',
  // Common Positive / Reaction Emojis
  '🔥': '[Fire]',
  '🚀': '[Rocket]',
  '🎉': '[Party]',
  '🎊': '[Celebration]',
  '💯': '[100]',
  '👏': '[Clap]',
  '🙌': '[Hands Up]',
  '🤝': '[Handshake]',
  '🙏': '[Thank You]',
  '💪': '[Strong]',
  '👍': '[Thumbs Up]',
  '👎': '[Thumbs Down]',
  // Hearts
  '❤️': '[Heart]',
  '💖': '[Heart]',
  '💗': '[Heart]',
  '💓': '[Heart]',
  '💕': '[Hearts]',
  '💙': '[Heart]',
  '💚': '[Heart]',
  '💛': '[Heart]',
  '💜': '[Heart]',
  '🧡': '[Heart]',
  '🖤': '[Heart]',
  '🤍': '[Heart]',
  '🤎': '[Heart]',
  // Faces / Emotions
  '😊': ':)',
  '😀': ':D',
  '😃': ':D',
  '😄': ':D',
  '😁': ':D',
  '🙂': ':)',
  '😇': 'O:)',
  '😉': ';)',
  '😍': '[Heart-Eyes]',
  '🤩': '[Star-Struck]',
  '😎': '[Cool]',
  '🥳': '[Party]',
  '😂': '[Laugh]',
  '🤣': '[ROFL]',
  '😭': ":'(",
  '😢': ':(',
  '😞': ':(',
  '🙁': ':(',
  '☹️': ':(',
  '😡': '[Angry]',
  '🤔': '[Thinking]',
  '🤯': '[Mind Blown]',
  '😴': '[Sleepy]',
  // Status / Icons
  '💡': '[Idea]',
  '⚡': '[Lightning]',
  '🎯': '[Target]',
  '🏆': '[Trophy]',
  '🥇': '[1st]',
  '🥈': '[2nd]',
  '🥉': '[3rd]',
  '✅': '[✓]',
  '✔️': '[✓]',
  '❌': '[X]',
  '✖️': '[X]',
  '⚠️': '[Warning]',
  '❓': '[?]',
  '❗': '[!]',
  // Tech / Education / Office
  '💻': '[Computer]',
  '🖥️': '[Desktop]',
  '📱': '[Phone]',
  '🎓': '[Graduation]',
  '📚': '[Books]',
  '📖': '[Book]',
  '📝': '[Note]',
  '💬': '[Comment]',
  '🗨️': '[Chat]',
  '🗯️': '[Message]',
  '📌': '[Pin]',
  '📍': '[Location]',
  '🔔': '[Bell]',
  '🔒': '[Lock]',
  '🔑': '[Key]',
  '🔗': '[Link]',
  '⏰': '[Clock]',
  '⏳': '[Hourglass]',
  '⏱️': '[Timer]',
  '☕': '[Coffee]',
  '🍕': '[Pizza]',
  '🎂': '[Cake]',
  '🎁': '[Gift]',
  '🌐': '[Web]',
  '🤖': '[Bot]',
  '🛠️': '[Tools]',
  '⚙️': '[Settings]',
  '📊': '[Analytics]',
  '📈': '[Growth]',
};

/**
 * Sanitizes strings for jsPDF rendering:
 * 1. Converts repeated star emojis (e.g. ⭐⭐⭐⭐⭐ or ★★★★★) into concise rating tags like "[5 Stars]".
 * 2. Translates common unicode emojis into clean textual representations.
 * 3. Normalizes smart quotes, em-dashes, and special typographical symbols.
 * 4. Strips surrogate pairs / remaining unprintable astral symbols to prevent corrupted mojibake symbols.
 */
export const sanitizePdfText = (value: any): string => {
  if (value === null || value === undefined) return '';
  let text = String(value);

  // Group repeated star sequences (e.g. ⭐⭐⭐⭐⭐ or ★★★★★)
  text = text.replace(/(?:⭐|★|🌟){1,5}/g, (match) => {
    const count = [...match].length;
    return `[${count} Star${count > 1 ? 's' : ''}]`;
  });

  // Replace mapped emojis
  for (const [emoji, replacement] of Object.entries(EMOJI_TEXT_MAP)) {
    if (text.includes(emoji)) {
      text = text.split(emoji).join(replacement);
    }
  }

  // Normalize smart punctuation & special symbols to WinAnsi / ASCII equivalents
  text = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/[\uFE0E\uFE0F\u200B\u200C\u200D]/g, ''); // variation selectors & zero-width joiners

  // Replace any remaining unhandled Unicode emojis / surrogate pairs / astral symbols
  text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\p{Extended_Pictographic}/gu, ' ');

  // Collapse consecutive whitespaces created by stripping/replacing
  text = text.replace(/ {2,}/g, ' ').trim();

  return text;
};

export const hasEmoji = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  const emojiRegex = /\p{Extended_Pictographic}|[\uD83C-\uD83E][\uDF00-\uDFFF]|[\u2600-\u27BF]/u;
  return emojiRegex.test(val);
};

const MM_TO_PX = 3.7795;
const CANVAS_SCALE = 3; // 3x oversampling for crisp, high-DPI retina rendering of emojis

export const renderEmojiCellToCanvas = (
  text: string,
  widthMm: number,
  heightMm: number,
  options: {
    fontSizePt?: number;
    textColor?: string;
    paddingMm?: number;
  } = {}
): string | null => {
  if (!text || typeof document === 'undefined') return null;

  const fontSizePt = options.fontSizePt || 8;
  const textColor = options.textColor || '#1e293b';
  const paddingMm = options.paddingMm !== undefined ? options.paddingMm : 1.5;

  const fontSizePx = fontSizePt * (96 / 72);
  const lineHeightPx = fontSizePx * 1.35;
  const paddingPx = paddingMm * MM_TO_PX;
  const availWidthPx = Math.max(10, widthMm * MM_TO_PX - paddingPx * 2);

  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

  // Measure and word-wrap lines
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return null;

  measureCtx.font = `${fontSizePx * CANVAS_SCALE}px ${fontFamily}`;

  const paragraphs = String(text).split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = measureCtx.measureText(testLine);
      const testWidth = metrics.width / CANVAS_SCALE;

      if (testWidth > availWidthPx && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  // Create high-DPI canvas
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(widthMm * MM_TO_PX * CANVAS_SCALE);
  canvas.height = Math.ceil(heightMm * MM_TO_PX * CANVAS_SCALE);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
  ctx.font = `${fontSizePx}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';

  let currentY = paddingPx;
  for (const line of lines) {
    ctx.fillText(line, paddingPx, currentY);
    currentY += lineHeightPx;
  }

  return canvas.toDataURL('image/png');
};

export const calculateEmojiCellHeight = (
  text: string,
  widthMm: number,
  fontSizePt: number = 8,
  paddingMm: number = 1.5
): number => {
  if (!text || typeof document === 'undefined') return 8;

  const fontSizePx = fontSizePt * (96 / 72);
  const lineHeightPx = fontSizePx * 1.35;
  const paddingPx = paddingMm * MM_TO_PX;
  const availWidthPx = Math.max(10, widthMm * MM_TO_PX - paddingPx * 2);

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return 8;

  measureCtx.font = `${fontSizePx * CANVAS_SCALE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

  const paragraphs = String(text).split('\n');
  let totalLines = 0;

  for (const para of paragraphs) {
    if (!para.trim()) {
      totalLines += 1;
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = measureCtx.measureText(testLine);
      const testWidth = metrics.width / CANVAS_SCALE;

      if (testWidth > availWidthPx && currentLine) {
        totalLines += 1;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      totalLines += 1;
    }
  }

  const totalHeightPx = totalLines * lineHeightPx + paddingPx * 2;
  return Math.max(8, totalHeightPx / MM_TO_PX);
};

export const exportMembersToExcel = (
  members: Member[],
  filterType: 'all' | 'members' | 'core',
  _searchQuery: string
) => {
  const data = members.map((m, index) => ({
    'S.No': index + 1,
    'Member Name': sanitizeFormulaValue(m.name || ''),
    'Email': sanitizeFormulaValue(m.email || ''),
    'Official Email': sanitizeFormulaValue(formatOfficialEmail(m.uid)),
    'Mobile No': sanitizeFormulaValue(m.phone || 'N/A'),
    'University UID': sanitizeFormulaValue(m.uid || 'N/A'),
    'Member ID': sanitizeFormulaValue(m.member_id || (m as any).registration_id || 'N/A'),
    'Department': sanitizeFormulaValue(m.department || 'N/A'),
    'Year': sanitizeFormulaValue(m.year || 'N/A'),
    'Role / Core Status': sanitizeFormulaValue(m.is_core_member ? (m.role?.name || 'Core Member') : 'General Member'),
    'Status': sanitizeFormulaValue(m.status || 'active'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for optimal Excel readability
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Name
    { wch: 28 }, // Email
    { wch: 28 }, // Official Email
    { wch: 15 }, // Mobile
    { wch: 15 }, // UID
    { wch: 16 }, // Member ID
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
    formatOfficialEmail(m.uid) || 'N/A',
    m.phone || 'N/A',
    m.uid || 'N/A',
    m.department || 'N/A',
    m.year || 'N/A',
    m.is_core_member ? (m.role?.name || 'Core Member') : 'Member',
  ]);

  autoTable(doc, {
    startY: 27,
    head: [['#', 'Member Name', 'Email', 'Official Email', 'Mobile No', 'University UID', 'Department', 'Year', 'Role / Status']],
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
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const rawVal = data.cell.raw;
        if (hasEmoji(rawVal)) {
          (data.cell as any)._rawEmoji = String(rawVal);
          const colWidth = data.column.width || (data.cell.styles as any).cellWidth || 30;
          const minH = calculateEmojiCellHeight(String(rawVal), typeof colWidth === 'number' ? colWidth : 30, 8.5);
          data.cell.styles.minCellHeight = Math.max(data.cell.styles.minCellHeight || 0, minH);
          data.cell.text = [];
        }
      }
    },
    didDrawCell: (data: any) => {
      if (data.section === 'body' && (data.cell as any)._rawEmoji) {
        const rawVal = (data.cell as any)._rawEmoji;
        const imgData = renderEmojiCellToCanvas(rawVal, data.cell.width, data.cell.height, {
          fontSizePt: 8.5,
          textColor: '#1e293b',
          paddingMm: 1.5,
        });
        if (imgData) {
          doc.addImage(imgData, 'PNG', data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
      }
    },
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
  feedbacks: (ContactFeedback | EventFeedback)[],
  filterType: string,
  searchQuery: string,
  eventsList?: { id: string; title: string; status?: string }[]
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Cloud Stack Club — Feedbacks & Inquiries Directory', 14, 15);

  // Subtitle / Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);

  const filterText = filterType.replace('_', ' ').toUpperCase();
  const searchNote = searchQuery ? ` | Search: "${searchQuery}"` : '';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  doc.text(`Filter: ${filterText} (${feedbacks.length} total)${searchNote}  •  Exported on: ${dateStr}`, 14, 22);

  const eventMap = new Map((eventsList || []).map((e) => [e.id, e]));

  // Table Data mapping
  const tableRows = feedbacks.map((f, index) => {
    const uid = 'university_id' in f && f.university_id ? f.university_id : '—';
    const regId = 'registration_id' in f && f.registration_id ? f.registration_id : '—';
    let eventName = 'Contact Form';
    if ('event_id' in f && f.event_id) {
      const matched = eventMap.get(f.event_id);
      if (matched) {
        eventName = `${matched.title}${matched.status === 'cancelled' ? ' (Cancelled)' : ''}`;
      } else {
        eventName = f.event_title || 'Event Feedback';
      }
    }

    return [
      (index + 1).toString(),
      f.name || 'N/A',
      uid,
      regId,
      eventName,
      f.email || 'N/A',
      f.message || 'N/A',
      (f.status || 'pending').toUpperCase(),
      f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A',
    ];
  });

  autoTable(doc, {
    startY: 27,
    head: [['#', 'Sender Name', 'UID', 'Reg ID', 'Category / Event', 'Email', 'Message / Feedback', 'Status', 'Received Date']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { cellWidth: 22 },
      3: { cellWidth: 26 },
      4: { cellWidth: 32 },
      5: { cellWidth: 38 },
      6: { cellWidth: 70 },
      7: { cellWidth: 20 },
      8: { cellWidth: 22 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 27, left: 14, right: 14, bottom: 16 },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const rawVal = data.cell.raw;
        if (hasEmoji(rawVal)) {
          (data.cell as any)._rawEmoji = String(rawVal);
          const colWidth = data.column.width || (data.cell.styles as any).cellWidth || 70;
          const minH = calculateEmojiCellHeight(String(rawVal), typeof colWidth === 'number' ? colWidth : 70, 8);
          data.cell.styles.minCellHeight = Math.max(data.cell.styles.minCellHeight || 0, minH);
          data.cell.text = [];
        }
      }
    },
    didDrawCell: (data: any) => {
      if (data.section === 'body' && (data.cell as any)._rawEmoji) {
        const rawVal = (data.cell as any)._rawEmoji;
        const imgData = renderEmojiCellToCanvas(rawVal, data.cell.width, data.cell.height, {
          fontSizePt: 8,
          textColor: '#1e293b',
          paddingMm: 1.5,
        });
        if (imgData) {
          doc.addImage(imgData, 'PNG', data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
      }
    },
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
