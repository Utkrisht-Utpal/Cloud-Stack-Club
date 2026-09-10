import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollText,
  Check,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  CheckSquare,
  ArrowRight,
  ChevronDown,
  IndentDecrease,
  IndentIncrease,
  RemoveFormatting,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import {
  escapeHtml,
  sanitizeRulesHtml,
  cleanPastedHtml,
  convertPlainTextToHtml,
} from '../../utils/rulesFormatting';
import { ColorWheelPicker } from './ColorWheelPicker';

interface EventRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
  initialRules?: string;
  onSave: (rules: string) => void;
}

const MAX_RULES_LENGTH = 5000;

// Find closest element with given tag name
const findClosestTag = (
  node: Node | null,
  tagName: string,
  root: HTMLElement
): HTMLElement | null => {
  let curr: Node | null = node;
  while (curr && curr !== root) {
    if (
      curr.nodeType === Node.ELEMENT_NODE &&
      (curr as HTMLElement).tagName.toUpperCase() === tagName.toUpperCase()
    ) {
      return curr as HTMLElement;
    }
    curr = curr.parentNode;
  }
  return null;
};

// Find closest block element inside editor
const findClosestBlock = (
  node: Node | null,
  root: HTMLElement
): HTMLElement | null => {
  let curr: Node | null = node;
  while (curr && curr !== root) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const tag = (curr as HTMLElement).tagName.toLowerCase();
      if (['p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3'].includes(tag)) {
        return curr as HTMLElement;
      }
    }
    curr = curr.parentNode;
  }
  return null;
};

// Compute visible character offset of target node/offset within editor root
const getCharacterOffset = (root: HTMLElement, targetNode: Node, targetOffset: number): number => {
  let offset = 0;
  let found = false;

  const traverse = (node: Node) => {
    if (found) return;
    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += targetOffset;
      } else {
        for (let i = 0; i < targetOffset && i < node.childNodes.length; i++) {
          offset += node.childNodes[i].textContent?.length || 0;
        }
      }
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent || '').length;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
        if (found) return;
      }
    }
  };

  traverse(root);
  return offset;
};

// Restore selection from character offsets within editor root
const setSelectionFromOffsets = (root: HTMLElement, start: number, end: number) => {
  let currentOffset = 0;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      if (!startNode && currentOffset + len >= start) {
        startNode = node;
        startOffset = Math.max(0, start - currentOffset);
      }
      if (!endNode && currentOffset + len >= end) {
        endNode = node;
        endOffset = Math.max(0, end - currentOffset);
      }
      currentOffset += len;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  };

  traverse(root);

  if (!startNode) {
    startNode = root;
    startOffset = root.childNodes.length;
  }
  if (!endNode) {
    endNode = root;
    endOffset = root.childNodes.length;
  }

  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    try {
      const maxStart = startNode.nodeType === Node.TEXT_NODE ? (startNode.textContent || '').length : startNode.childNodes.length;
      const maxEnd = endNode.nodeType === Node.TEXT_NODE ? (endNode.textContent || '').length : endNode.childNodes.length;
      range.setStart(startNode, Math.min(startOffset, maxStart));
      range.setEnd(endNode, Math.min(endOffset, maxEnd));
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // Ignored
    }
  }
};

export const EventRulesModal: React.FC<EventRulesModalProps> = ({
  isOpen,
  onClose,
  eventTitle = 'Event',
  initialRules = '',
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lineSpacingRef = useRef<HTMLDivElement>(null);
  const listsDropdownRef = useRef<HTMLDivElement>(null);

  const savedRangeRef = useRef<Range | null>(null);
  const preferredFontSizeRef = useRef<'small' | 'normal' | 'large'>('normal');

  // Undo/Redo history stack
  const historyRef = useRef<{ html: string; start: number; end: number }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryApplyingRef = useRef<boolean>(false);

  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Active toolbar states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [activeFontSize, setActiveFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [activeListType, setActiveListType] = useState<
    'bullet' | 'numbered' | 'checklist' | 'arrow' | null
  >(null);
  const [activeColor, setActiveColor] = useState<string>('');
  const [recentColors, setRecentColors] = useState<string[]>([
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
  ]);
  const [activeLineSpacing, setActiveLineSpacing] = useState<'1' | '1.5' | '2' | '2.5'>('1.5');
  const [activeIndent, setActiveIndent] = useState<number>(0);

  // Dropdown open states
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isLineSpacingOpen, setIsLineSpacingOpen] = useState(false);
  const [isListsDropdownOpen, setIsListsDropdownOpen] = useState(false);
  const [isPlaceholderDismissed, setIsPlaceholderDismissed] = useState(false);

  // Save current selection range
  const saveCurrentRange = useCallback(() => {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current &&
      editorRef.current.contains(sel.anchorNode)
    ) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore saved selection range
  const restoreSavedRange = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (
      (!sel || !sel.rangeCount || !editorRef.current.contains(sel.anchorNode)) &&
      savedRangeRef.current
    ) {
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
  }, []);

  // Calculate visible textual length (excluding HTML markup and CSS markers)
  const getVisibleTextLength = useCallback((): number => {
    if (!editorRef.current) return 0;
    return (editorRef.current.textContent || '').length;
  }, []);

  // Record undo/redo snapshot
  const pushHistorySnapshot = useCallback(() => {
    if (isHistoryApplyingRef.current || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const sel = window.getSelection();
    let start = 0;
    let end = 0;
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      start = getCharacterOffset(editorRef.current, range.startContainer, range.startOffset);
      end = getCharacterOffset(editorRef.current, range.endContainer, range.endOffset);
    }

    const curr = historyRef.current[historyIndexRef.current];
    if (curr && curr.html === html) return;

    const nextIndex = historyIndexRef.current + 1;
    historyRef.current = historyRef.current.slice(0, nextIndex);
    historyRef.current.push({ html, start, end });
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // Update active formatting states from current selection
  const updateActiveFormatting = useCallback(() => {
    if (!editorRef.current) return;

    saveCurrentRange();

    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
    } catch {
      // Ignored
    }

    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !editorRef.current.contains(sel.anchorNode)) {
      setActiveListType(null);
      return;
    }

    // Check list state
    const li = findClosestTag(sel.anchorNode, 'LI', editorRef.current);
    if (li && li.parentElement) {
      const parentList = li.parentElement;
      const type = parentList.getAttribute('data-list-type');
      if (type === 'numbered' || parentList.tagName.toLowerCase() === 'ol') {
        setActiveListType('numbered');
      } else if (type === 'checklist') {
        setActiveListType('checklist');
      } else if (type === 'arrow') {
        setActiveListType('arrow');
      } else {
        setActiveListType('bullet');
      }
    } else {
      setActiveListType(null);
    }

    // Check font size state
    let node: Node | null = sel.anchorNode;
    let detectedSize: 'small' | 'normal' | 'large' | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const sizeAttr = el.getAttribute('data-font-size');
        if (sizeAttr === 'small' || sizeAttr === 'large') {
          detectedSize = sizeAttr;
          break;
        }
        const style = el.getAttribute('style') || '';
        if (style.includes('0.75rem') || style.includes('12px')) {
          detectedSize = 'small';
          break;
        }
        if (style.includes('1.125rem') || style.includes('18px')) {
          detectedSize = 'large';
          break;
        }
      }
      node = node.parentNode;
    }

    if (detectedSize) {
      setActiveFontSize(detectedSize);
      preferredFontSizeRef.current = detectedSize;
    } else {
      setActiveFontSize('normal');
      preferredFontSizeRef.current = 'normal';
    }

    // Detect active text color (including mixed colors in selection)
    let detectedColor = '';
    if (!sel.isCollapsed && editorRef.current) {
      try {
        const range = sel.getRangeAt(0);
        const elements = editorRef.current.querySelectorAll('*');
        const colorsFound = new Set<string>();
        elements.forEach((el) => {
          if (range.intersectsNode(el)) {
            if (el.tagName.toLowerCase() === 'font') {
              const c = el.getAttribute('color');
              if (c) colorsFound.add(c.toLowerCase());
            }
            const styleAttr = (el as HTMLElement).getAttribute('style') || '';
            const match = styleAttr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
            if (match) {
              colorsFound.add(match[1].trim().toLowerCase());
            }
          }
        });
        if (colorsFound.size > 1) {
          detectedColor = 'mixed';
        } else if (colorsFound.size === 1) {
          detectedColor = Array.from(colorsFound)[0];
        }
      } catch {
        // Fallback
      }
    }

    if (!detectedColor) {
      let colorNode: Node | null = sel.anchorNode;
      while (colorNode && colorNode !== editorRef.current) {
        if (colorNode.nodeType === Node.ELEMENT_NODE) {
          const el = colorNode as HTMLElement;
          if (el.tagName.toLowerCase() === 'font') {
            detectedColor = el.getAttribute('color') || '';
            break;
          }
          const styleAttr = el.getAttribute('style') || '';
          const colorMatch = styleAttr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
          if (colorMatch) {
            detectedColor = colorMatch[1].trim();
            break;
          }
        }
        colorNode = colorNode.parentNode;
      }
    }
    setActiveColor(detectedColor);

    // Detect active line spacing
    let spacingNode: Node | null = sel.anchorNode;
    let detectedSpacing: '1' | '1.5' | '2' | '2.5' = '1.5';
    while (spacingNode && spacingNode !== editorRef.current) {
      if (spacingNode.nodeType === Node.ELEMENT_NODE) {
        const el = spacingNode as HTMLElement;
        const sp = el.getAttribute('data-line-spacing');
        if (sp === '1' || sp === '1.5' || sp === '2' || sp === '2.5') {
          detectedSpacing = sp;
          break;
        }
      }
      spacingNode = spacingNode.parentNode;
    }
    setActiveLineSpacing(detectedSpacing);

    // Detect active indent level
    let indentNode: Node | null = sel.anchorNode;
    let detectedIndent = 0;
    while (indentNode && indentNode !== editorRef.current) {
      if (indentNode.nodeType === Node.ELEMENT_NODE) {
        const el = indentNode as HTMLElement;
        const ind = el.getAttribute('data-indent');
        if (ind) {
          detectedIndent = parseInt(ind, 10) || 0;
          break;
        }
      }
      indentNode = indentNode.parentNode;
    }
    setActiveIndent(detectedIndent);
  }, [saveCurrentRange]);

  // Synchronize editor state and character count
  const updateEditorState = useCallback(() => {
    const len = getVisibleTextLength();
    setCharCount(len);
    if (len <= MAX_RULES_LENGTH) {
      setError(null);
    }
    updateActiveFormatting();
    pushHistorySnapshot();
  }, [getVisibleTextLength, updateActiveFormatting, pushHistorySnapshot]);

  // Undo implementation
  const handleUndo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current > 0) {
      isHistoryApplyingRef.current = true;
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      editorRef.current.innerHTML = state.html;
      setSelectionFromOffsets(editorRef.current, state.start, state.end);
      setCharCount(getVisibleTextLength());
      updateActiveFormatting();
      isHistoryApplyingRef.current = false;
    } else {
      document.execCommand('undo', false);
      setCharCount(getVisibleTextLength());
      updateActiveFormatting();
    }
  }, [getVisibleTextLength, updateActiveFormatting]);

  // Redo implementation
  const handleRedo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isHistoryApplyingRef.current = true;
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      editorRef.current.innerHTML = state.html;
      setSelectionFromOffsets(editorRef.current, state.start, state.end);
      setCharCount(getVisibleTextLength());
      updateActiveFormatting();
      isHistoryApplyingRef.current = false;
    } else {
      document.execCommand('redo', false);
      setCharCount(getVisibleTextLength());
      updateActiveFormatting();
    }
  }, [getVisibleTextLength, updateActiveFormatting]);

  // Input handler
  const handleInput = useCallback(() => {
    setIsPlaceholderDismissed(true);
    updateEditorState();
  }, [updateEditorState]);

  // Callback ref to load initial rules
  const setEditorRef = useCallback(
    (node: HTMLDivElement | null) => {
      (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (node) {
        let initialHtml = '';
        if (initialRules && initialRules.trim()) {
          setIsPlaceholderDismissed(true);
          const hasHtml = /<[a-z][\s\S]*>/i.test(initialRules);
          if (hasHtml) {
            initialHtml = sanitizeRulesHtml(initialRules);
          } else {
            initialHtml = convertPlainTextToHtml(initialRules);
          }
        } else {
          setIsPlaceholderDismissed(false);
        }
        node.innerHTML = initialHtml;
        setCharCount(node.textContent?.length || 0);

        // Initialize history
        historyRef.current = [{ html: initialHtml, start: 0, end: 0 }];
        historyIndexRef.current = 0;

        try {
          document.execCommand('defaultParagraphSeparator', false, 'p');
        } catch {
          // Ignored
        }
      }
    },
    [initialRules]
  );

  // Load initial content on open or rules update
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setIsFontDropdownOpen(false);
    setIsColorPickerOpen(false);
    setIsLineSpacingOpen(false);
    setIsListsDropdownOpen(false);
    setActiveIndent(0);
    preferredFontSizeRef.current = 'normal';

    let initialHtml = '';
    if (initialRules && initialRules.trim()) {
      setIsPlaceholderDismissed(true);
      const hasHtml = /<[a-z][\s\S]*>/i.test(initialRules);
      if (hasHtml) {
        initialHtml = sanitizeRulesHtml(initialRules);
      } else {
        initialHtml = convertPlainTextToHtml(initialRules);
      }
    } else {
      setIsPlaceholderDismissed(false);
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
      setCharCount(editorRef.current.textContent?.length || 0);
      historyRef.current = [{ html: initialHtml, start: 0, end: 0 }];
      historyIndexRef.current = 0;
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch {
        // Ignored
      }
    }
  }, [isOpen, initialRules]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(target)) {
        setIsFontDropdownOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setIsColorPickerOpen(false);
      }
      if (lineSpacingRef.current && !lineSpacingRef.current.contains(target)) {
        setIsLineSpacingOpen(false);
      }
      if (listsDropdownRef.current && !listsDropdownRef.current.contains(target)) {
        setIsListsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format toggles (bold, italic, underline)
  const handleToggleFormat = (command: 'bold' | 'italic' | 'underline') => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();
    document.execCommand(command, false);
    saveCurrentRange();
    updateEditorState();
  };

  // Font size handler
  const handleApplyFontSize = (size: 'small' | 'normal' | 'large') => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();
    preferredFontSizeRef.current = size;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);

    const rawText = editorRef.current.textContent || '';
    if (!rawText.trim()) {
      const p = document.createElement('p');
      if (size !== 'normal') {
        p.setAttribute('data-font-size', size);
        p.setAttribute(
          'style',
          size === 'small'
            ? 'font-size: 0.75rem; line-height: 1.25rem;'
            : 'font-size: 1.125rem; line-height: 1.6rem;'
        );
      }
      p.innerHTML = '<br>';
      editorRef.current.innerHTML = '';
      editorRef.current.appendChild(p);

      const newRange = document.createRange();
      newRange.setStart(p, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();

      setActiveFontSize(size);
      setIsFontDropdownOpen(false);
      updateEditorState();
      return;
    }

    if (!range.collapsed) {
      try {
        document.execCommand('fontSize', false, '7');
      } catch {
        // Fallback below
      }

      const fontNodes = editorRef.current.querySelectorAll('font[size="7"]');
      if (fontNodes.length > 0) {
        fontNodes.forEach((fontEl) => {
          if (size === 'normal') {
            fontEl.querySelectorAll('[data-font-size]').forEach((s) => {
              s.removeAttribute('data-font-size');
              s.removeAttribute('style');
            });
            const parent = fontEl.parentNode;
            while (fontEl.firstChild) {
              parent?.insertBefore(fontEl.firstChild, fontEl);
            }
            fontEl.remove();
          } else {
            const span = document.createElement('span');
            span.setAttribute('data-font-size', size);
            span.setAttribute(
              'style',
              size === 'small'
                ? 'font-size: 0.75rem; line-height: 1.25rem;'
                : 'font-size: 1.125rem; line-height: 1.6rem;'
            );
            while (fontEl.firstChild) {
              span.appendChild(fontEl.firstChild);
            }
            fontEl.parentNode?.replaceChild(span, fontEl);
          }
        });
      }
    } else {
      const block = findClosestBlock(sel.anchorNode, editorRef.current);
      if (block && block !== editorRef.current) {
        if (size === 'normal') {
          block.removeAttribute('data-font-size');
          block.removeAttribute('style');
        } else {
          block.setAttribute('data-font-size', size);
          block.setAttribute(
            'style',
            size === 'small'
              ? 'font-size: 0.75rem; line-height: 1.25rem;'
              : 'font-size: 1.125rem; line-height: 1.6rem;'
          );
        }
      }
    }

    saveCurrentRange();
    setActiveFontSize(size);
    setIsFontDropdownOpen(false);
    updateEditorState();
  };

  // Line spacing handler
  const handleApplyLineSpacing = (spacing: '1' | '1.5' | '2' | '2.5') => {
    if (!editorRef.current) return;
    restoreSavedRange();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    const blocks: HTMLElement[] = [];
    Array.from(editorRef.current.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.tagName.toLowerCase() === 'ul' || el.tagName.toLowerCase() === 'ol') {
        Array.from(el.children).forEach((li) => blocks.push(li as HTMLElement));
      } else {
        blocks.push(el);
      }
    });

    const targetBlocks = range.collapsed
      ? [findClosestBlock(sel.anchorNode, editorRef.current)].filter(Boolean) as HTMLElement[]
      : blocks.filter((b) => {
          try {
            return range.intersectsNode(b) || b.contains(range.startContainer) || b.contains(range.endContainer);
          } catch {
            return false;
          }
        });

    targetBlocks.forEach((block) => {
      if (spacing === '1.5') {
        block.removeAttribute('data-line-spacing');
      } else {
        block.setAttribute('data-line-spacing', spacing);
      }
    });

    setActiveLineSpacing(spacing);
    setIsLineSpacingOpen(false);
    updateEditorState();
  };

  // Text color handler
  const handleApplyColor = (color: string) => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();

    if (!color) {
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch {
        // Ignored
      }
      document.execCommand('foreColor', false, 'inherit');
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        const range = sel.getRangeAt(0);
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_ELEMENT);
        const toStrip: HTMLElement[] = [];
        let curr = walker.nextNode();
        while (curr) {
          const el = curr as HTMLElement;
          if (range.intersectsNode(el)) {
            if (/color\s*:/i.test(el.getAttribute('style') || '')) toStrip.push(el);
            if (el.tagName.toLowerCase() === 'font' && el.getAttribute('color')) toStrip.push(el);
          }
          curr = walker.nextNode();
        }
        toStrip.forEach((el) => {
          if (el.tagName.toLowerCase() === 'font') {
            el.removeAttribute('color');
          } else {
            const cleaned = (el.getAttribute('style') || '')
              .replace(/(?:^|;)\s*color\s*:[^;]*/gi, '')
              .trim()
              .replace(/^;/, '')
              .trim();
            if (cleaned) el.setAttribute('style', cleaned);
            else el.removeAttribute('style');
          }
        });
      }
      setActiveColor('');
    } else {
      try {
        document.execCommand('styleWithCSS', false, 'true');
      } catch {
        // Ignored
      }
      document.execCommand('foreColor', false, color);
      setActiveColor(color);
      // Track recent colors (max 8)
      setRecentColors((prev) => {
        const normalized = color.toUpperCase();
        const filtered = prev.filter((c) => c.toUpperCase() !== normalized);
        return [normalized, ...filtered].slice(0, 8);
      });
    }

    saveCurrentRange();
    updateEditorState();
  };

  // Reset color handler
  const handleResetColor = () => {
    handleApplyColor('');
    setIsColorPickerOpen(false);
  };

  // Indentation handler (Increase / Decrease indent)
  const handleIndent = (direction: 'increase' | 'decrease') => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);

    const blocks: HTMLElement[] = [];
    Array.from(editorRef.current.children).forEach((child) => {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        Array.from(el.children).forEach((li) => {
          if (li.tagName.toLowerCase() === 'li') {
            blocks.push(li as HTMLElement);
          }
        });
      } else {
        blocks.push(el);
      }
    });

    let targetBlocks: HTMLElement[] = [];
    if (range.collapsed) {
      let block = findClosestTag(sel.anchorNode, 'LI', editorRef.current);
      if (!block) {
        block = findClosestTag(sel.anchorNode, 'P', editorRef.current);
      }
      if (!block) {
        block = findClosestBlock(sel.anchorNode, editorRef.current);
      }
      if (block && block !== editorRef.current) {
        if (block.tagName.toLowerCase() === 'ul' || block.tagName.toLowerCase() === 'ol') {
          const firstLi = block.querySelector('li') as HTMLElement | null;
          if (firstLi) targetBlocks = [firstLi];
        } else {
          targetBlocks = [block];
        }
      }
    } else {
      targetBlocks = blocks.filter((b) => {
        try {
          return range.intersectsNode(b) || b.contains(range.startContainer) || b.contains(range.endContainer);
        } catch {
          return false;
        }
      });
    }

    if (targetBlocks.length === 0) {
      const fallback = findClosestBlock(sel.anchorNode, editorRef.current);
      if (fallback && fallback !== editorRef.current) {
        targetBlocks = [fallback];
      }
    }

    let updatedIndent = 0;
    targetBlocks.forEach((block) => {
      const currentIndent = parseInt(block.getAttribute('data-indent') || '0', 10) || 0;
      let nextIndent = direction === 'increase' ? currentIndent + 1 : currentIndent - 1;
      if (nextIndent < 0) nextIndent = 0;
      if (nextIndent > 6) nextIndent = 6;
      updatedIndent = nextIndent;

      if (nextIndent === 0) {
        block.removeAttribute('data-indent');
        block.style.marginLeft = '';
        if (!block.getAttribute('style')) {
          block.removeAttribute('style');
        }
      } else {
        block.setAttribute('data-indent', String(nextIndent));
        block.style.marginLeft = `${nextIndent * 1.5}rem`;
      }
    });

    setActiveIndent(updatedIndent);
    saveCurrentRange();
    updateEditorState();
  };

  // Clear formatting handler (preserves lists, removes inline bold/italic/underline/color/font-size/line-spacing/indent)
  const handleClearFormatting = () => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();

    document.execCommand('removeFormat', false);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      const elements = editorRef.current.querySelectorAll('*');
      elements.forEach((el) => {
        const hEl = el as HTMLElement;
        const tag = hEl.tagName.toLowerCase();
        if (range.intersectsNode(hEl)) {
          if (tag === 'font') {
            const parent = hEl.parentNode;
            while (hEl.firstChild) parent?.insertBefore(hEl.firstChild, hEl);
            hEl.remove();
            return;
          }
          hEl.removeAttribute('data-font-size');
          hEl.removeAttribute('data-line-spacing');
          hEl.removeAttribute('data-indent');
          if (tag !== 'ul' && tag !== 'ol') {
            hEl.removeAttribute('data-align');
          }
          hEl.removeAttribute('style');
        }
      });
    }

    setActiveIndent(0);
    saveCurrentRange();
    updateEditorState();
  };

  // Multi-line list toggle handler supporting Bullet, Numbered, Checklist, Arrow
  const handleToggleList = (targetType: 'bullet' | 'numbered' | 'checklist' | 'arrow') => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();
    if (!editorRef.current) return;
    editorRef.current.focus();

    const rawText = editorRef.current.textContent?.trim() || '';
    const hasLis = editorRef.current.querySelectorAll('li').length > 0;

    // Completely empty editor
    if (!rawText && !hasLis) {
      const tag = targetType === 'numbered' ? 'ol' : 'ul';
      editorRef.current.innerHTML = `<${tag} data-list-type="${targetType}"><li><br></li></${tag}>`;
      const li = editorRef.current.querySelector('li');
      if (li) {
        const range = document.createRange();
        range.setStart(li, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        savedRangeRef.current = range.cloneRange();
      }
      setActiveListType(targetType);
      updateEditorState();
      return;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // 1. Capture selection character bounds before DOM restructuring
    const selStart = getCharacterOffset(editorRef.current, range.startContainer, range.startOffset);
    const selEnd = getCharacterOffset(editorRef.current, range.endContainer, range.endOffset);
    const isCollapsed = range.collapsed;

    // 2. Pre-normalize: Split any <p> or <div> blocks that contain <br> separating text into separate <p> blocks
    const topNodes = Array.from(editorRef.current.childNodes);
    topNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.trim()) {
          const p = document.createElement('p');
          p.textContent = node.textContent;
          editorRef.current?.replaceChild(p, node);
        } else {
          node.remove();
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'div') {
          const p = document.createElement('p');
          ['data-font-size', 'data-line-spacing', 'data-align', 'data-indent', 'style'].forEach((attr) => {
            if (el.hasAttribute(attr)) p.setAttribute(attr, el.getAttribute(attr)!);
          });
          while (el.firstChild) p.appendChild(el.firstChild);
          editorRef.current?.replaceChild(p, el);
        }
      }
    });

    // Split paragraphs with <br> into individual paragraphs
    const splitParagraphsWithBr = (pEl: HTMLElement) => {
      if (!pEl.querySelector('br')) return;
      const html = pEl.innerHTML;
      const parts = html.split(/<br\s*\/?>/i);
      if (parts.length > 1) {
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          const newP = document.createElement('p');
          ['data-font-size', 'data-line-spacing', 'data-align', 'data-indent', 'style'].forEach((attr) => {
            if (pEl.hasAttribute(attr)) newP.setAttribute(attr, pEl.getAttribute(attr)!);
          });
          newP.innerHTML = part.trim() ? part : '<br>';
          frag.appendChild(newP);
        });
        pEl.parentNode?.replaceChild(frag, pEl);
      }
    };

    Array.from(editorRef.current.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.tagName.toLowerCase() === 'p') {
        splitParagraphsWithBr(el);
      }
    });

    // 3. Collect candidate line blocks and determine their character ranges
    interface LineBlockInfo {
      element: HTMLElement;
      isLi: boolean;
      parentList: HTMLElement | null;
      text: string;
      start: number;
      end: number;
      isSelected: boolean;
    }

    const candidateLines: LineBlockInfo[] = [];
    let runningOffset = 0;

    Array.from(editorRef.current.children).forEach((child) => {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        Array.from(el.children).forEach((liChild) => {
          const li = liChild as HTMLElement;
          const text = li.textContent || '';
          const len = text.length;
          const lineStart = runningOffset;
          const lineEnd = runningOffset + len;
          runningOffset += len;

          const isSelected = isCollapsed
            ? (lineStart <= selStart && selStart <= lineEnd) || (lineStart === lineEnd && selStart === lineStart)
            : lineEnd > selStart && lineStart < selEnd;

          candidateLines.push({
            element: li,
            isLi: true,
            parentList: el,
            text,
            start: lineStart,
            end: lineEnd,
            isSelected,
          });
        });
      } else {
        const text = el.textContent || '';
        const len = text.length;
        const lineStart = runningOffset;
        const lineEnd = runningOffset + len;
        runningOffset += len;

        const isSelected = isCollapsed
          ? (lineStart <= selStart && selStart <= lineEnd) || (lineStart === lineEnd && selStart === lineStart)
          : lineEnd > selStart && lineStart < selEnd;

        candidateLines.push({
          element: el,
          isLi: false,
          parentList: null,
          text,
          start: lineStart,
          end: lineEnd,
          isSelected,
        });
      }
    });

    const selectedLines = candidateLines.filter((line) => line.isSelected);
    if (selectedLines.length === 0) return;

    // 4. Check if all selected lines are already list items of targetType (Toggle Off)
    const allSelectedMatchTarget =
      selectedLines.length > 0 &&
      selectedLines.every((line) => {
        if (!line.isLi || !line.parentList) return false;
        const listType =
          line.parentList.getAttribute('data-list-type') ||
          (line.parentList.tagName.toLowerCase() === 'ol' ? 'numbered' : 'bullet');
        return listType === targetType;
      });

    const newChildren: HTMLElement[] = [];
    let currentListGroup: HTMLElement | null = null;
    let firstConvertedLi: HTMLElement | null = null;
    let lastConvertedLi: HTMLElement | null = null;

    const flushListGroup = () => {
      if (currentListGroup) {
        newChildren.push(currentListGroup);
        currentListGroup = null;
      }
    };

    if (allSelectedMatchTarget) {
      // --- ACTION: TOGGLE OFF (Convert selected <li> back to <p>) ---
      for (const line of candidateLines) {
        if (line.isSelected) {
          flushListGroup();
          const p = document.createElement('p');
          p.innerHTML = line.element.innerHTML || '<br>';
          ['data-font-size', 'data-line-spacing', 'data-align', 'data-indent', 'style'].forEach((attr) => {
            if (line.element.hasAttribute(attr)) p.setAttribute(attr, line.element.getAttribute(attr)!);
          });
          newChildren.push(p);
        } else if (line.isLi && line.parentList) {
          const parentType = line.parentList.getAttribute('data-list-type') || 'bullet';
          const parentTag = line.parentList.tagName.toLowerCase();
          if (
            !currentListGroup ||
            currentListGroup.tagName.toLowerCase() !== parentTag ||
            currentListGroup.getAttribute('data-list-type') !== parentType
          ) {
            flushListGroup();
            currentListGroup = document.createElement(parentTag);
            currentListGroup.setAttribute('data-list-type', parentType);
          }
          currentListGroup.appendChild(line.element.cloneNode(true));
        } else {
          flushListGroup();
          newChildren.push(line.element.cloneNode(true) as HTMLElement);
        }
      }
      flushListGroup();
      setActiveListType(null);
    } else {
      // --- ACTION: CONVERT TO TARGET LIST TYPE ---
      for (const line of candidateLines) {
        if (line.isSelected) {
          const targetTag = targetType === 'numbered' ? 'ol' : 'ul';
          if (
            !currentListGroup ||
            currentListGroup.tagName.toLowerCase() !== targetTag ||
            currentListGroup.getAttribute('data-list-type') !== targetType
          ) {
            flushListGroup();
            currentListGroup = document.createElement(targetTag);
            currentListGroup.setAttribute('data-list-type', targetType);
          }

          const li = document.createElement('li');
          li.innerHTML = line.element.innerHTML || '<br>';
          ['data-font-size', 'data-line-spacing', 'data-align', 'data-indent', 'style'].forEach((attr) => {
            if (line.element.hasAttribute(attr)) li.setAttribute(attr, line.element.getAttribute(attr)!);
          });
          currentListGroup.appendChild(li);

          if (!firstConvertedLi) firstConvertedLi = li;
          lastConvertedLi = li;
        } else if (line.isLi && line.parentList) {
          const parentType = line.parentList.getAttribute('data-list-type') || 'bullet';
          const parentTag = line.parentList.tagName.toLowerCase();
          if (
            !currentListGroup ||
            currentListGroup.tagName.toLowerCase() !== parentTag ||
            currentListGroup.getAttribute('data-list-type') !== parentType
          ) {
            flushListGroup();
            currentListGroup = document.createElement(parentTag);
            currentListGroup.setAttribute('data-list-type', parentType);
          }
          currentListGroup.appendChild(line.element.cloneNode(true));
        } else {
          flushListGroup();
          newChildren.push(line.element.cloneNode(true) as HTMLElement);
        }
      }
      flushListGroup();
      setActiveListType(targetType);
    }

    // Merge adjacent identical lists
    const mergedChildren: HTMLElement[] = [];
    newChildren.forEach((child) => {
      const prev = mergedChildren[mergedChildren.length - 1];
      if (
        prev &&
        (prev.tagName.toLowerCase() === 'ul' || prev.tagName.toLowerCase() === 'ol') &&
        prev.tagName.toLowerCase() === child.tagName.toLowerCase() &&
        prev.getAttribute('data-list-type') === child.getAttribute('data-list-type')
      ) {
        while (child.firstChild) prev.appendChild(child.firstChild);
      } else {
        mergedChildren.push(child);
      }
    });

    editorRef.current.innerHTML = '';
    mergedChildren.forEach((node) => editorRef.current?.appendChild(node));

    // Restore selection over converted items
    if (firstConvertedLi && lastConvertedLi) {
      try {
        const newRange = document.createRange();
        newRange.setStart(firstConvertedLi, 0);
        newRange.setEnd(lastConvertedLi, (lastConvertedLi as HTMLElement).childNodes.length);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      } catch {
        setSelectionFromOffsets(editorRef.current, selStart, selEnd);
      }
    } else {
      setSelectionFromOffsets(editorRef.current, selStart, selEnd);
    }

    updateEditorState();
  };

  // Keyboard navigation and shortcut handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y)
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        handleToggleFormat('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        handleToggleFormat('italic');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        handleToggleFormat('underline');
        return;
      }
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    }

    // Tab and Shift+Tab for Increase / Decrease Indent
    if (e.key === 'Tab') {
      e.preventDefault();
      handleIndent(e.shiftKey ? 'decrease' : 'increase');
      return;
    }

    // Backspace handling: Bug 2 fix for list items (including the first list item)
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        let targetLi: HTMLElement | null = findClosestTag(sel.anchorNode, 'LI', editorRef.current);
        if (!targetLi && sel.anchorNode) {
          if (sel.anchorNode.nodeType === Node.ELEMENT_NODE) {
            const el = sel.anchorNode as HTMLElement;
            if (el.tagName.toLowerCase() === 'ul' || el.tagName.toLowerCase() === 'ol') {
              const lis = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li') as HTMLElement[];
              targetLi = lis[Math.min(sel.anchorOffset, lis.length - 1)] || lis[0] || null;
            }
          }
        }

        if (targetLi) {
          const listParent = targetLi.parentElement;
          const liText = targetLi.textContent?.trim() || '';

          // Case A: Backspace on an empty list item (including the first list item)
          if (liText === '') {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';

            if (listParent) {
              const isFirstLi = targetLi === listParent.firstElementChild;
              const hasMultipleLis = listParent.querySelectorAll('li').length > 1;

              if (isFirstLi && hasMultipleLis) {
                listParent.parentNode?.insertBefore(p, listParent);
                targetLi.remove();
              } else if (!isFirstLi && hasMultipleLis) {
                const prevLi = targetLi.previousElementSibling as HTMLElement;
                targetLi.remove();
                if (prevLi) {
                  const range = document.createRange();
                  range.selectNodeContents(prevLi);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  updateEditorState();
                  return;
                }
              } else {
                listParent.parentNode?.replaceChild(p, listParent);
              }
            }

            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            updateEditorState();
            return;
          }

          // Case B: Backspace at beginning of list item with text (cursor at offset 0)
          if (sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const isAtBeginning = range.startOffset === 0 && (range.startContainer === targetLi || range.startContainer === targetLi.firstChild);

            if (isAtBeginning && listParent) {
              const isFirstLi = targetLi === listParent.firstElementChild;
              if (isFirstLi) {
                e.preventDefault();
                const p = document.createElement('p');
                p.innerHTML = targetLi.innerHTML;
                ['data-font-size', 'data-line-spacing', 'data-align', 'data-indent', 'style'].forEach((attr) => {
                  if (targetLi?.hasAttribute(attr)) p.setAttribute(attr, targetLi.getAttribute(attr)!);
                });

                if (listParent.querySelectorAll('li').length === 1) {
                  listParent.parentNode?.replaceChild(p, listParent);
                } else {
                  listParent.parentNode?.insertBefore(p, listParent);
                  targetLi.remove();
                }

                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
                updateEditorState();
                return;
              }
            }
          }
        }
      }
    }

    // Enter handling: Bug 3 fix (Double Enter exits list)
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !editorRef.current) return;

      let li = findClosestTag(sel.anchorNode, 'LI', editorRef.current);
      if (!li && sel.anchorNode && sel.anchorNode.nodeType === Node.ELEMENT_NODE) {
        const el = sel.anchorNode as HTMLElement;
        if (el.tagName.toLowerCase() === 'ul' || el.tagName.toLowerCase() === 'ol') {
          const lis = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li') as HTMLElement[];
          li = lis[Math.min(sel.anchorOffset, lis.length - 1)] || lis[0] || null;
        }
      }

      if (li) {
        e.preventDefault();
        const listParent = li.parentElement;
        const liText = li.textContent?.replace(/[\s\u200B\u00A0]/g, '') || '';

        // SECOND ENTER: Empty list item exits list and creates normal paragraph
        if (liText === '') {
          const nextSiblings: Node[] = [];
          let next = li.nextSibling;
          while (next) {
            nextSiblings.push(next);
            next = next.nextSibling;
          }

          const p = document.createElement('p');
          p.innerHTML = '<br>';

          if (listParent) {
            if (nextSiblings.length > 0) {
              const newSubList = listParent.cloneNode(false) as HTMLElement;
              nextSiblings.forEach((node) => newSubList.appendChild(node));
              listParent.parentNode?.insertBefore(newSubList, listParent.nextSibling);
              listParent.parentNode?.insertBefore(p, newSubList);
            } else {
              listParent.parentNode?.insertBefore(p, listParent.nextSibling);
            }
            li.remove();

            if (listParent.querySelectorAll('li').length === 0) {
              listParent.remove();
            }
          }

          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);

          updateEditorState();
          return;
        } else {
          // FIRST ENTER: Create next item in current list
          const range = sel.getRangeAt(0);
          const newLi = document.createElement('li');
          ['data-font-size', 'data-line-spacing', 'data-align', 'data-indent', 'style'].forEach((attr) => {
            if (li?.hasAttribute(attr)) newLi.setAttribute(attr, li.getAttribute(attr)!);
          });

          const afterRange = range.cloneRange();
          afterRange.setEndAfter(li.lastChild || li);
          const fragment = afterRange.extractContents();

          if (!fragment.textContent || fragment.textContent.trim() === '') {
            newLi.innerHTML = '<br>';
          } else {
            newLi.appendChild(fragment);
          }

          if (!li.childNodes.length || (li.textContent === '' && !li.querySelector('br'))) {
            li.innerHTML = '<br>';
          }

          li.parentNode?.insertBefore(newLi, li.nextSibling);

          const newRange = document.createRange();
          newRange.setStart(newLi, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);

          updateEditorState();
          return;
        }
      }
    }

    // 5,000 visible characters limit check
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      getVisibleTextLength() >= MAX_RULES_LENGTH
    ) {
      const sel = window.getSelection();
      const hasSelection = sel && sel.toString().length > 0;
      if (!hasSelection) {
        e.preventDefault();
        setError(
          `Rules text exceeds maximum limit of ${MAX_RULES_LENGTH.toLocaleString()} characters.`
        );
      }
    }
  };

  // Safe paste handling
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    const currentLen = getVisibleTextLength();
    const sel = window.getSelection();
    const selLen = sel ? sel.toString().length : 0;
    const available = MAX_RULES_LENGTH - (currentLen - selLen);

    if (available <= 0) {
      setError(
        `Rules text exceeds maximum limit of ${MAX_RULES_LENGTH.toLocaleString()} characters.`
      );
      return;
    }

    if (html) {
      const cleaned = cleanPastedHtml(html);
      const temp = document.createElement('div');
      temp.innerHTML = cleaned;
      const plainText = temp.textContent || '';

      if (plainText.length > available) {
        const truncated = plainText.slice(0, available);
        document.execCommand('insertText', false, truncated);
        setError(
          `Pasted content was truncated to fit the ${MAX_RULES_LENGTH.toLocaleString()} character limit.`
        );
      } else {
        document.execCommand('insertHTML', false, cleaned);
      }
    } else if (text) {
      const toInsert = text.slice(0, available);
      if (text.length > available) {
        setError(
          `Pasted content was truncated to fit the ${MAX_RULES_LENGTH.toLocaleString()} character limit.`
        );
      }
      if (toInsert.includes('\n')) {
        const lines = toInsert.split(/\r?\n/);
        const htmlLines = lines.map((l) => `<p>${escapeHtml(l) || '<br>'}</p>`).join('');
        document.execCommand('insertHTML', false, htmlLines);
      } else {
        document.execCommand('insertText', false, toInsert);
      }
    }

    updateEditorState();
  };

  const handleSave = () => {
    const textLen = getVisibleTextLength();
    if (textLen > MAX_RULES_LENGTH) {
      setError(
        `Rules text exceeds maximum limit of ${MAX_RULES_LENGTH.toLocaleString()} characters.`
      );
      return;
    }

    const html = editorRef.current ? editorRef.current.innerHTML : '';
    const sanitized = sanitizeRulesHtml(html);
    onSave(textLen === 0 ? '' : sanitized.trim());
    onClose();
  };

  const remainingChars = MAX_RULES_LENGTH - charCount;
  const isEmpty = charCount === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Event Rules & Guidelines — ${eventTitle || 'New Event'}`}
      hideCloseButton={true}
      maxWidth="max-w-xl"
    >
      <style>{`
        .rules-rich-editor ul,
        .rules-rich-editor ul[data-list-type="bullet"] {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin: 0.35rem 0 !important;
        }
        .rules-rich-editor ol,
        .rules-rich-editor ol[data-list-type="numbered"] {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin: 0.35rem 0 !important;
        }
        .rules-rich-editor ul[data-list-type="checklist"] {
          list-style-type: none !important;
          padding-left: 0 !important;
          margin: 0.35rem 0 !important;
        }
        .rules-rich-editor ul[data-list-type="checklist"] > li {
          position: relative !important;
          padding-left: 1.6rem !important;
          margin: 0.35rem 0 !important;
        }
        .rules-rich-editor ul[data-list-type="checklist"] > li::before {
          content: "☑" !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          color: #0284c7 !important;
          font-weight: 700 !important;
          font-size: 1.05em !important;
          user-select: none !important;
        }
        :is(.dark, [data-theme="dark"]) .rules-rich-editor ul[data-list-type="checklist"] > li::before {
          color: #38bdf8 !important;
        }
        .rules-rich-editor ul[data-list-type="arrow"] {
          list-style-type: none !important;
          padding-left: 0 !important;
          margin: 0.35rem 0 !important;
        }
        .rules-rich-editor ul[data-list-type="arrow"] > li {
          position: relative !important;
          padding-left: 1.6rem !important;
          margin: 0.35rem 0 !important;
        }
        .rules-rich-editor ul[data-list-type="arrow"] > li::before {
          content: "→" !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          color: #0284c7 !important;
          font-weight: 700 !important;
          font-size: 1.1em !important;
          user-select: none !important;
        }
        :is(.dark, [data-theme="dark"]) .rules-rich-editor ul[data-list-type="arrow"] > li::before {
          color: #38bdf8 !important;
        }
        .rules-rich-editor ul > li:empty,
        .rules-rich-editor ul > li:has(> br:only-child),
        .rules-rich-editor ol > li:empty,
        .rules-rich-editor ol > li:has(> br:only-child) {
          list-style-type: none !important;
        }
        .rules-rich-editor ul[data-list-type="checklist"] > li:empty,
        .rules-rich-editor ul[data-list-type="checklist"] > li:has(> br:only-child),
        .rules-rich-editor ul[data-list-type="arrow"] > li:empty,
        .rules-rich-editor ul[data-list-type="arrow"] > li:has(> br:only-child) {
          padding-left: 0 !important;
        }
        .rules-rich-editor ul[data-list-type="checklist"] > li:empty::before,
        .rules-rich-editor ul[data-list-type="checklist"] > li:has(> br:only-child)::before,
        .rules-rich-editor ul[data-list-type="arrow"] > li:empty::before,
        .rules-rich-editor ul[data-list-type="arrow"] > li:has(> br:only-child)::before {
          content: "" !important;
        }

        .rules-rich-editor [data-font-size="small"] {
          font-size: 0.75rem !important;
          line-height: 1.25rem !important;
        }
        .rules-rich-editor [data-font-size="normal"] {
          font-size: 0.875rem !important;
          line-height: 1.4rem !important;
        }
        .rules-rich-editor [data-font-size="large"] {
          font-size: 1.125rem !important;
          line-height: 1.6rem !important;
        }

        .rules-rich-editor [data-line-spacing="1"] {
          line-height: 1 !important;
        }
        .rules-rich-editor [data-line-spacing="1.5"] {
          line-height: 1.5 !important;
        }
        .rules-rich-editor [data-line-spacing="2"] {
          line-height: 2 !important;
        }
        .rules-rich-editor [data-line-spacing="2.5"] {
          line-height: 2.5 !important;
        }

        .rules-rich-editor [data-align="left"] {
          text-align: left !important;
        }
        .rules-rich-editor [data-align="center"] {
          text-align: center !important;
        }
        .rules-rich-editor [data-align="right"] {
          text-align: right !important;
        }

        .rules-rich-editor [data-indent="1"] {
          margin-left: 1.5rem !important;
        }
        .rules-rich-editor [data-indent="2"] {
          margin-left: 3rem !important;
        }
        .rules-rich-editor [data-indent="3"] {
          margin-left: 4.5rem !important;
        }
        .rules-rich-editor [data-indent="4"] {
          margin-left: 6rem !important;
        }
        .rules-rich-editor [data-indent="5"] {
          margin-left: 7.5rem !important;
        }
        .rules-rich-editor [data-indent="6"] {
          margin-left: 9rem !important;
        }
        .rules-rich-editor {
          color: #1e293b;
        }
        :is(.dark, [data-theme="dark"]) .rules-rich-editor {
          color: #f1f5f9 !important;
        }
        :is(.dark, [data-theme="dark"]) .rules-rich-editor p,
        :is(.dark, [data-theme="dark"]) .rules-rich-editor li,
        :is(.dark, [data-theme="dark"]) .rules-rich-editor strong,
        :is(.dark, [data-theme="dark"]) .rules-rich-editor b,
        :is(.dark, [data-theme="dark"]) .rules-rich-editor em,
        :is(.dark, [data-theme="dark"]) .rules-rich-editor u {
          color: inherit;
        }
        /* In dark mode, ensure any dark or black inline text colors are forced to high-contrast readable color */
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: #0"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:#0"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: #1"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:#1"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: #2"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:#2"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: #3"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:#3"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: #4"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:#4"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: #5"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:#5"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: black"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:black"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(0"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(0"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(1"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(1"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(2"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(2"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(3"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(3"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(4"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(4"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(5"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(5"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(6"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(6"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color: rgb(7"],
        :is(.dark, [data-theme="dark"]) .rules-rich-editor [style*="color:rgb(7"] {
          color: #f1f5f9 !important;
        }
        /* In light mode, ensure any white text is forced to dark slate */
        :not(.dark):not([data-theme="dark"]) .rules-rich-editor [style*="color: #fff"],
        :not(.dark):not([data-theme="dark"]) .rules-rich-editor [style*="color:#fff"],
        :not(.dark):not([data-theme="dark"]) .rules-rich-editor [style*="color: white"],
        :not(.dark):not([data-theme="dark"]) .rules-rich-editor [style*="color:white"],
        :not(.dark):not([data-theme="dark"]) .rules-rich-editor [style*="color: rgb(255"],
        :not(.dark):not([data-theme="dark"]) .rules-rich-editor [style*="color:rgb(255"] {
          color: #1e293b !important;
        }
      `}</style>

      <div className="space-y-4">
        {/* Header Notice Banner — light & dark theme */}
        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/25 flex items-start gap-3 shadow-xs dark:shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-blue-100/90 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
            <ScrollText className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-blue-900 dark:text-sky-200 tracking-wide text-xs">
              Configure Event Participation Rules
            </p>
            <p className="text-blue-800/80 dark:text-slate-300 text-[11.5px] leading-relaxed">
              Define the eligibility guidelines, event schedule flow, judging criteria, code of conduct, and submission specifications.
            </p>
          </div>
        </div>

        {/* Rich Text Editor Container — light & dark theme */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-2xl dark:shadow-black/40 relative focus-within:ring-2 focus-within:ring-blue-500/30 dark:focus-within:ring-sky-500/50 focus-within:border-blue-500/60 dark:focus-within:border-sky-500/70 transition-all">
          {/* Professional Compact Toolbar — single unified row, all buttons in one line */}
          <div className="px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-700/70 bg-slate-50/90 dark:bg-slate-800/70 flex items-center flex-nowrap gap-1 relative z-40 select-none rounded-t-2xl">
            {/* Group 1: Bold · Italic · Underline */}
            <div className="flex items-center bg-slate-200/60 dark:bg-slate-900/70 border border-slate-300/80 dark:border-slate-700/60 rounded-lg p-0.5 shrink-0 shadow-inner">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => handleToggleFormat('bold')}
                title="Bold (Ctrl+B)"
                aria-label="Bold (Ctrl+B)"
                aria-pressed={isBold}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isBold
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700/70'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => handleToggleFormat('italic')}
                title="Italic (Ctrl+I)"
                aria-label="Italic (Ctrl+I)"
                aria-pressed={isItalic}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isItalic
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700/70'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => handleToggleFormat('underline')}
                title="Underline (Ctrl+U)"
                aria-label="Underline (Ctrl+U)"
                aria-pressed={isUnderline}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isUnderline
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700/70'
                }`}
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700/60 shrink-0" />

            {/* Group 2: Font Size Dropdown */}
            <div className="relative shrink-0" ref={fontDropdownRef}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => {
                  setIsPlaceholderDismissed(true);
                  setIsFontDropdownOpen((prev) => !prev);
                  setIsColorPickerOpen(false);
                  setIsLineSpacingOpen(false);
                  setIsListsDropdownOpen(false);
                }}
                title="Font Size"
                aria-label="Font Size"
                aria-haspopup="listbox"
                aria-expanded={isFontDropdownOpen}
                className={`h-7 px-2 rounded-lg flex items-center gap-1 text-[11.5px] font-medium tracking-wide border transition-all cursor-pointer ${
                  isFontDropdownOpen
                    ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-slate-700 dark:border-slate-600 dark:text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-700/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/70 dark:hover:border-slate-600 shadow-xs'
                }`}
              >
                <span className="capitalize">{activeFontSize}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isFontDropdownOpen
                      ? 'rotate-180 text-blue-600 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
              </button>

              {isFontDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full mt-2 w-40 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-700/80 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/80 p-1.5 z-50 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {(['small', 'normal', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={activeFontSize === size}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleApplyFontSize(size)}
                      className={`w-full px-3 py-2 flex items-center justify-between cursor-pointer transition-all text-xs rounded-xl ${
                        activeFontSize === size
                          ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/15 dark:text-sky-400'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <span
                        className={`font-medium ${
                          size === 'small' ? 'text-[11px]' : size === 'large' ? 'text-sm font-semibold' : 'text-xs'
                        }`}
                      >
                        {size === 'small'
                          ? 'Small — 12px'
                          : size === 'normal'
                          ? 'Normal — 14px'
                          : 'Large — 18px'}
                      </span>
                      {activeFontSize === size && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700/60 shrink-0" />

            {/* Group 3: Line Spacing Dropdown */}
            <div className="relative shrink-0" ref={lineSpacingRef}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => {
                  setIsLineSpacingOpen((prev) => !prev);
                  setIsFontDropdownOpen(false);
                  setIsColorPickerOpen(false);
                  setIsListsDropdownOpen(false);
                }}
                title={`Line Spacing (${activeLineSpacing}×)`}
                aria-label="Line Spacing"
                aria-haspopup="listbox"
                aria-expanded={isLineSpacingOpen}
                className={`h-7 px-1.5 rounded-lg flex items-center gap-1 border transition-all cursor-pointer ${
                  isLineSpacingOpen
                    ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-slate-700 dark:border-slate-600 dark:text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-700/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/70 dark:hover:border-slate-600 shadow-xs'
                }`}
              >
                {/* Line Spacing Icon (Vertical Blue Double Arrow + 4 Horizontal Text Lines) */}
                <svg
                  viewBox="0 0 20 20"
                  className="w-3.5 h-3.5"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3.2 5.8L5.5 3.2L7.8 5.8M3.2 14.2L5.5 16.8L7.8 14.2M5.5 3.5V16.5"
                    className="stroke-sky-500 dark:stroke-sky-400"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 4.5H18M10 8.5H18M10 12.5H18M10 16.5H18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isLineSpacingOpen
                      ? 'rotate-180 text-blue-600 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
              </button>

              {isLineSpacingOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full mt-2 w-40 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-700/80 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/80 p-1.5 z-50 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {(['1', '1.5', '2', '2.5'] as const).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      role="option"
                      aria-selected={activeLineSpacing === sp}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleApplyLineSpacing(sp)}
                      className={`w-full px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-all rounded-xl ${
                        activeLineSpacing === sp
                          ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/15 dark:text-sky-400'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <span className="font-medium">
                        {sp === '1'
                          ? 'Compact (1.0)'
                          : sp === '1.5'
                          ? 'Normal (1.5)'
                          : sp === '2'
                          ? 'Relaxed (2.0)'
                          : 'Extra (2.5)'}
                      </span>
                      {activeLineSpacing === sp && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700/60 shrink-0" />

            {/* Group 4: Text Color Picker & Custom Color */}
            <div className="relative shrink-0" ref={colorPickerRef}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => {
                  setIsPlaceholderDismissed(true);
                  setIsColorPickerOpen((prev) => !prev);
                  setIsFontDropdownOpen(false);
                  setIsLineSpacingOpen(false);
                  setIsListsDropdownOpen(false);
                }}
                title="Text Color"
                aria-label="Text Color"
                aria-haspopup="dialog"
                aria-expanded={isColorPickerOpen}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  isColorPickerOpen
                    ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-slate-700 dark:border-slate-600 dark:text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-700/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/70 dark:hover:border-slate-600 shadow-xs'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="textColorRainbow"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#ff4500" />
                      <stop offset="25%" stopColor="#ffaa00" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="75%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <path
                    d="m6 15.5 6-12 6 12M8 11.5h8"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="4"
                    y="18.5"
                    width="16"
                    height="3.5"
                    rx="1.75"
                    fill="url(#textColorRainbow)"
                  />
                </svg>
              </button>

              {isColorPickerOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <ColorWheelPicker
                    currentColor={activeColor}
                    recentColors={recentColors}
                    onApplyColor={(color) => handleApplyColor(color)}
                    onResetColor={handleResetColor}
                    onClose={() => setIsColorPickerOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700/60 shrink-0" />

            {/* Group 5: Lists Dropdown (Bullet, Numbered, Checklist, Arrow) */}
            <div className="relative shrink-0" ref={listsDropdownRef}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => {
                  setIsListsDropdownOpen((prev) => !prev);
                  setIsFontDropdownOpen(false);
                  setIsColorPickerOpen(false);
                  setIsLineSpacingOpen(false);
                }}
                title="Lists (Bullet, Numbered, Checklist, Arrow)"
                aria-label="Lists"
                aria-haspopup="listbox"
                aria-expanded={isListsDropdownOpen}
                className={`h-7 px-2 rounded-lg flex items-center gap-1 text-[11.5px] font-medium border transition-all cursor-pointer ${
                  activeListType
                    ? 'bg-blue-50 border-blue-400 text-blue-600 dark:bg-blue-600/20 dark:border-blue-500/60 dark:text-sky-300 shadow-xs'
                    : isListsDropdownOpen
                    ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-slate-700 dark:border-slate-600 dark:text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-700/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/70 dark:hover:border-slate-600 shadow-xs'
                }`}
              >
                {activeListType === 'numbered' ? (
                  <ListOrdered className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                ) : activeListType === 'checklist' ? (
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                ) : activeListType === 'arrow' ? (
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                ) : (
                  <List className="w-3.5 h-3.5" />
                )}
                <span>Lists</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isListsDropdownOpen
                      ? 'rotate-180 text-blue-600 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
              </button>

              {isListsDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full mt-2 w-44 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-700/80 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/80 p-1.5 z-50 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={activeListType === 'bullet'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleToggleList('bullet');
                      setIsListsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-all rounded-xl ${
                      activeListType === 'bullet'
                        ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/15 dark:text-sky-400'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-medium">
                      <List className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>Bullet List</span>
                    </div>
                    {activeListType === 'bullet' && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    role="option"
                    aria-selected={activeListType === 'numbered'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleToggleList('numbered');
                      setIsListsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-all rounded-xl ${
                      activeListType === 'numbered'
                        ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/15 dark:text-sky-400'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-medium">
                      <ListOrdered className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>Numbered List</span>
                    </div>
                    {activeListType === 'numbered' && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    role="option"
                    aria-selected={activeListType === 'checklist'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleToggleList('checklist');
                      setIsListsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-all rounded-xl ${
                      activeListType === 'checklist'
                        ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/15 dark:text-sky-400'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-medium">
                      <CheckSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>Checklist</span>
                    </div>
                    {activeListType === 'checklist' && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    role="option"
                    aria-selected={activeListType === 'arrow'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleToggleList('arrow');
                      setIsListsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-all rounded-xl ${
                      activeListType === 'arrow'
                        ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/15 dark:text-sky-400'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-medium">
                      <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>Arrow List</span>
                    </div>
                    {activeListType === 'arrow' && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700/60 shrink-0" />

            {/* Group 6: Indent & Outdent */}
            <div className="flex items-center bg-slate-200/60 dark:bg-slate-900/70 border border-slate-300/80 dark:border-slate-700/60 rounded-lg p-0.5 shrink-0 shadow-inner gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => handleIndent('decrease')}
                title="Decrease Indent (Shift+Tab)"
                aria-label="Decrease Indent"
                disabled={activeIndent === 0}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  activeIndent === 0
                    ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700/70'
                }`}
              >
                <IndentDecrease className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveCurrentRange();
                }}
                onClick={() => handleIndent('increase')}
                title="Increase Indent (Tab)"
                aria-label="Increase Indent"
                disabled={activeIndent >= 6}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  activeIndent >= 6
                    ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700/70'
                }`}
              >
                <IndentIncrease className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700/60 shrink-0" />

            {/* Group 7: Clear Formatting button */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveCurrentRange();
              }}
              onClick={handleClearFormatting}
              title="Clear Formatting"
              aria-label="Clear Formatting"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-700/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/70 dark:hover:border-slate-600 shrink-0 active:scale-95 shadow-xs"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Editable Content Area */}
          <div
            className="relative min-h-[220px] max-h-[340px] overflow-y-auto p-4 cursor-text bg-white dark:bg-transparent"
            onClick={() => editorRef.current?.focus()}
          >
            {/* Placeholder Guidelines */}
            {!isPlaceholderDismissed && isEmpty && (
              <div className="absolute top-4 left-4 right-4 pointer-events-none select-none text-xs sm:text-sm leading-relaxed font-sans opacity-80">
                <div className="text-slate-500 dark:text-slate-400 font-semibold mb-2">Example guidelines:</div>
                <div className="space-y-1 text-slate-400 dark:text-slate-500">
                  <div>• Eligibility: Open to all students.</div>
                  <div>• Team Size: 1–4 members.</div>
                  <div>• Code of Conduct: Maintain professional behavior.</div>
                </div>
              </div>
            )}

            {/* Rich Contenteditable Input Area */}
            <div
              ref={setEditorRef}
              contentEditable
              role="textbox"
              aria-multiline="true"
              aria-label="Configure Event Participation Rules content"
              onInput={handleInput}
              onKeyDown={(e) => {
                setIsPlaceholderDismissed(true);
                handleKeyDown(e);
              }}
              onPaste={(e) => {
                setIsPlaceholderDismissed(true);
                handlePaste(e);
              }}
              onBlur={updateEditorState}
              onKeyUp={updateActiveFormatting}
              onMouseUp={updateActiveFormatting}
              className="rules-rich-editor min-h-[200px] outline-none text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-100 font-sans"
            />
          </div>

          {/* Footer Status Bar — light & dark theme */}
          <div className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/80 flex items-center justify-between rounded-b-2xl">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-sky-400 animate-pulse shrink-0" />
              <span className="font-medium text-slate-600 dark:text-slate-400">Double Enter exits list • Ctrl+B/I/U/Z enabled</span>
            </div>

            <div
              className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold tracking-wide transition-colors shrink-0 ${
                remainingChars < 200
                  ? remainingChars <= 0
                    ? 'bg-red-50 dark:bg-red-500/15 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 font-bold'
                    : 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 shadow-xs'
              }`}
            >
              {charCount.toLocaleString()} / {MAX_RULES_LENGTH.toLocaleString()} chars
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons — light & dark theme */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-blue-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 hover:shadow-sky-500/30 active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5 text-white" />
            <span>Save Rules</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
