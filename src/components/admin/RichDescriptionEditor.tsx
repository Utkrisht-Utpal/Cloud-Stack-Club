import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TextModifierToolbar } from './TextModifierToolbar';
import type {
  TextFormatCommand,
  ActiveFormats,
  ToolbarPosition,
} from './TextModifierToolbar';

interface RichDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

// Convert any rgb/rgba/hex string to uppercase #HEX
function rgbToHex(colorStr: string): string {
  if (!colorStr) return '';
  if (colorStr.startsWith('#')) return colorStr.toUpperCase();
  const match = colorStr.match(/\d+/g);
  if (!match || match.length < 3) return colorStr;
  const r = parseInt(match[0], 10);
  const g = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

// Deeply detect active font size and color from selected range
function detectRangeFormatting(range: Range, editor: HTMLElement): { fontSize: string; color: string } {
  let detectedFontSize = '14';
  let detectedColor = '';

  const startEl =
    range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;

  const endEl =
    range.endContainer instanceof HTMLElement
      ? range.endContainer
      : range.endContainer.parentElement;

  const commonEl =
    range.commonAncestorContainer instanceof HTMLElement
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

  const candidates: HTMLElement[] = [];
  if (startEl) candidates.push(startEl);
  if (endEl && endEl !== startEl) candidates.push(endEl);
  if (commonEl && !candidates.includes(commonEl)) candidates.push(commonEl);

  // Also query styled nodes inside commonEl intersecting selection
  if (commonEl && editor.contains(commonEl)) {
    const styledChildren = commonEl.querySelectorAll(
      'span[style*="font-size"], [style*="font-size"], span[style*="color"], font[color], font[size]'
    );
    styledChildren.forEach((child) => {
      const el = child as HTMLElement;
      try {
        if (range.intersectsNode(el)) {
          candidates.push(el);
        }
      } catch {
        candidates.push(el);
      }
    });
  }

  // 1. Detect Font Size
  for (const el of candidates) {
    if (!el || !editor.contains(el)) continue;
    const fontEl = el.closest('span[style*="font-size"], [style*="font-size"], font[size]') as HTMLElement | null;
    if (fontEl && editor.contains(fontEl)) {
      if (fontEl.style.fontSize) {
        const match = fontEl.style.fontSize.match(/(\d+)/);
        if (match) {
          detectedFontSize = match[1];
          break;
        }
      } else if (fontEl.hasAttribute('size')) {
        const sizeAttr = fontEl.getAttribute('size');
        const sizeMap: Record<string, string> = {
          '1': '10', '2': '12', '3': '14', '4': '16', '5': '18', '6': '20', '7': '24'
        };
        if (sizeAttr && sizeMap[sizeAttr]) {
          detectedFontSize = sizeMap[sizeAttr];
          break;
        }
      }
    }
  }

  if (detectedFontSize === '14' && startEl && editor.contains(startEl)) {
    try {
      const computed = window.getComputedStyle(startEl).fontSize;
      const match = computed.match(/(\d+)/);
      if (match && match[1] !== '14') {
        detectedFontSize = match[1];
      }
    } catch {}
  }

  // 2. Detect Color
  for (const el of candidates) {
    if (!el || !editor.contains(el)) continue;
    const colorEl = el.closest('span[style*="color"], font[color], [style*="color"]') as HTMLElement | null;
    if (colorEl && editor.contains(colorEl)) {
      if (colorEl.hasAttribute('color')) {
        const c = colorEl.getAttribute('color') || '';
        if (c && c !== 'inherit' && c !== 'initial') {
          detectedColor = c;
        }
      } else if (
        colorEl.style.color &&
        colorEl.style.color !== 'inherit' &&
        colorEl.style.color !== 'currentColor'
      ) {
        detectedColor = colorEl.style.color;
      }
      if (detectedColor) break;
    }
  }

  // Intentionally avoid document.queryCommandValue('foreColor') because in Chromium/WebKit
  // it returns the computed CSS color of the container, falsely tagging default text as hardcoded black or white.

  if (detectedColor) {
    detectedColor = rgbToHex(detectedColor);
  }

  return { fontSize: detectedFontSize, color: detectedColor };
}

export const RichDescriptionEditor: React.FC<RichDescriptionEditorProps> = ({
  value,
  onChange,
  placeholder = 'Event details, schedule, and guidelines...',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Undo / Redo history management
  const historyRef = useRef<string[]>([value || '']);
  const historyIndexRef = useRef<number>(0);
  const isHistoryNavigatingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);

  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    strike: false,
    orderedList: false,
    unorderedList: false,
    blockquote: false,
  });

  const [activeColor, setActiveColor] = useState<string>('');
  const [isEmpty, setIsEmpty] = useState(!value || value.trim() === '');

  // Push new state into history stack
  const pushHistory = (newHtml: string) => {
    if (isHistoryNavigatingRef.current) return;
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    // Avoid duplicate states
    if (history[currentIndex] === newHtml) return;

    // Discard any forward redo branches
    const updatedHistory = history.slice(0, currentIndex + 1);
    updatedHistory.push(newHtml);

    // Keep history bounded to 60 snapshots
    if (updatedHistory.length > 60) {
      updatedHistory.shift();
    }

    historyRef.current = updatedHistory;
    historyIndexRef.current = updatedHistory.length - 1;
  };

  // Helper to normalize empty HTML
  const isHtmlEmpty = (html: string): boolean => {
    if (!html) return true;
    const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s+/g, '');
    return stripped.length === 0;
  };

  // Synchronize incoming value with contentEditable innerHTML
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (value !== currentHtml) {
        if (!value) {
          editorRef.current.innerHTML = '';
          setIsEmpty(true);
        } else {
          // If value is plain text with newlines and without HTML tags, convert \n to <p>
          if (!/<[a-z][\s\S]*>/i.test(value)) {
            const paragraphs = value
              .split('\n')
              .map((line) => (line.trim() ? `<p>${line}</p>` : '<p><br></p>'))
              .join('');
            editorRef.current.innerHTML = paragraphs;
          } else {
            editorRef.current.innerHTML = value;
          }
          setIsEmpty(isHtmlEmpty(editorRef.current.innerHTML));
        }

        // Initialize history stack with loaded content
        if (historyRef.current.length === 1 && historyRef.current[0] === '' && value) {
          historyRef.current = [editorRef.current.innerHTML];
          historyIndexRef.current = 0;
        }
      }
    }
  }, [value]);

  // Calculate coordinates & active format states when text is selected
  const updateSelectionState = useCallback(() => {
    const sel = window.getSelection();
    if (
      !sel ||
      sel.isCollapsed ||
      !sel.rangeCount ||
      !editorRef.current ||
      !containerRef.current
    ) {
      setToolbarPosition(null);
      return;
    }

    // Ensure selection is strictly inside this editor
    if (
      !editorRef.current.contains(sel.anchorNode) ||
      !editorRef.current.contains(sel.focusNode)
    ) {
      setToolbarPosition(null);
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText) {
      setToolbarPosition(null);
      return;
    }

    try {
      const range = sel.getRangeAt(0);
      savedRangeRef.current = range.cloneRange();
      const rangeRect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      // Check if selection is scrolled out or immediately adjacent to editor viewport edges
      if (
        rangeRect.bottom <= editorRect.top + 4 ||
        rangeRect.top >= editorRect.bottom - 4 ||
        (rangeRect.width === 0 && rangeRect.height === 0)
      ) {
        setToolbarPosition(null);
        return;
      }

      // Compact toolbar dimensions
      const toolbarWidth = 216; // 4 visible features + 3-dot More menu
      const vMargin = 6; // Margin from top/bottom borders of description box
      const hMargin = 8; // Margin from left/right borders of description box

      // Description box boundaries relative to containerRef
      const boxTop = editorRect.top - containerRect.top;
      const boxBottom = editorRect.bottom - containerRect.top;
      const boxLeft = editorRect.left - containerRect.left;
      const boxRight = editorRect.right - containerRect.left;

      // Selection center and edges relative to containerRef
      const selectionCenterX = rangeRect.left + rangeRect.width / 2 - containerRect.left;
      const selectionTop = rangeRect.top - containerRect.top;
      const selectionBottom = rangeRect.bottom - containerRect.top;

      // Available vertical space inside description box
      const spaceAbove = selectionTop - boxTop;
      const spaceBelow = boxBottom - selectionBottom;

      const toolbarHeight = 38;
      const caretHeight = 6;
      const totalFootprint = toolbarHeight + caretHeight; // 44px
      const clearance = 8; // Clean breathing gap from text

      let toolbarTop: number;
      let placement: 'top' | 'bottom';

      // Prioritize placing the toolbar BELOW the selection:
      // 1. The highlighted text is directly visible above the toolbar.
      // 2. Dropdowns open downward naturally without shooting up into the modal header.
      if (spaceBelow >= totalFootprint + clearance) {
        placement = 'bottom';
        toolbarTop = selectionBottom + clearance + caretHeight;
      } else if (spaceAbove >= totalFootprint + clearance) {
        placement = 'top';
        toolbarTop = selectionTop - totalFootprint - clearance;
      } else {
        placement = 'bottom';
        toolbarTop = selectionBottom + clearance + caretHeight;
      }

      // Strictly clamp toolbarTop within description box boundaries
      let minTop: number;
      let maxTop: number;
      if (placement === 'top') {
        minTop = boxTop + vMargin;
        // Never allow toolbar to be pushed downwards so far that it overlaps selection
        maxTop = Math.max(minTop, Math.min(boxBottom - totalFootprint - vMargin, selectionTop - totalFootprint - 2));
      } else {
        // Never allow toolbar to be pushed upwards so far that it overlaps selection
        minTop = Math.min(boxBottom - toolbarHeight - vMargin, Math.max(boxTop + vMargin + caretHeight, selectionBottom + 4));
        maxTop = Math.max(minTop, boxBottom - toolbarHeight - vMargin);
      }
      toolbarTop = Math.max(minTop, Math.min(toolbarTop, maxTop));

      // Strictly clamp toolbarLeft so it NEVER overflows description box left or right
      let toolbarLeft = selectionCenterX - toolbarWidth / 2;
      const minLeft = boxLeft + hMargin;
      const maxLeft = Math.max(minLeft, boxRight - toolbarWidth - hMargin);
      toolbarLeft = Math.max(minLeft, Math.min(toolbarLeft, maxLeft));

      // Caret position relative to toolbar
      let caretX = selectionCenterX - toolbarLeft;
      // Clamp caret within toolbar pill rounded edges
      caretX = Math.max(16, Math.min(caretX, toolbarWidth - 16));

      setToolbarPosition({
        x: toolbarLeft,
        y: toolbarTop,
        caretX,
        placement,
      });

      // Determine active formats
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isStrike = document.queryCommandState('strikeThrough');
      const isOrdered = document.queryCommandState('insertOrderedList');
      const isUnordered = document.queryCommandState('insertUnorderedList');

      const parentEl =
        range.commonAncestorContainer instanceof HTMLElement
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;

      const isQuote = !!parentEl?.closest('blockquote');

      // Comprehensive detection of Font Size and Color across selection
      const { fontSize: detectedFontSize, color: detectedColor } = detectRangeFormatting(
        range,
        editorRef.current
      );
      setActiveColor(detectedColor);

      // Detect active line spacing
      let detectedLineSpacing = '1.5';
      const blockEl = (
        parentEl?.closest('p, li, blockquote') ||
        range.startContainer.parentElement?.closest('p, li, blockquote')
      ) as HTMLElement | null;
      if (blockEl && editorRef.current?.contains(blockEl)) {
        if (blockEl.style.lineHeight) {
          detectedLineSpacing = blockEl.style.lineHeight;
        }
      }

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        strike: isStrike,
        orderedList: isOrdered,
        unorderedList: isUnordered,
        blockquote: isQuote,
        fontSize: detectedFontSize,
        lineSpacing: detectedLineSpacing,
      });
    } catch {
      setToolbarPosition(null);
    }
  }, []);

  // Listen to selection changes and scrolling globally
  useEffect(() => {
    const handleDocumentSelection = () => {
      // Small timeout allows browser selection to finalize
      setTimeout(updateSelectionState, 10);
    };

    const handleScrollOrResize = () => {
      updateSelectionState();
    };

    document.addEventListener('selectionchange', handleDocumentSelection);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelection);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [updateSelectionState]);

  // Handle content edits
  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const empty = isHtmlEmpty(html);
    setIsEmpty(empty);
    onChange(empty ? '' : html);
    updateSelectionState();

    // Debounce history snapshot for typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      pushHistory(html);
    }, 400);
  };

  // Undo execution (Ctrl+Z)
  const handleUndo = () => {
    if (!editorRef.current) return;
    if (historyIndexRef.current > 0) {
      isHistoryNavigatingRef.current = true;
      historyIndexRef.current -= 1;
      const prevHtml = historyRef.current[historyIndexRef.current];
      editorRef.current.innerHTML = prevHtml;
      const empty = isHtmlEmpty(prevHtml);
      setIsEmpty(empty);
      onChange(empty ? '' : prevHtml);
      updateSelectionState();
      isHistoryNavigatingRef.current = false;
    } else {
      document.execCommand('undo', false);
      handleInput();
    }
  };

  // Redo execution (Ctrl+Y or Ctrl+Shift+Z)
  const handleRedo = () => {
    if (!editorRef.current) return;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isHistoryNavigatingRef.current = true;
      historyIndexRef.current += 1;
      const nextHtml = historyRef.current[historyIndexRef.current];
      editorRef.current.innerHTML = nextHtml;
      const empty = isHtmlEmpty(nextHtml);
      setIsEmpty(empty);
      onChange(empty ? '' : nextHtml);
      updateSelectionState();
      isHistoryNavigatingRef.current = false;
    } else {
      document.execCommand('redo', false);
      handleInput();
    }
  };

  // Execute formatting actions
  const handleFormat = (command: TextFormatCommand) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // Push state before formatting
    pushHistory(editorRef.current.innerHTML);

    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    const parentEl =
      range.commonAncestorContainer instanceof HTMLElement
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;

    if (command === 'bold') {
      document.execCommand('bold', false);
    } else if (command === 'italic') {
      document.execCommand('italic', false);
    } else if (command === 'strike') {
      document.execCommand('strikeThrough', false);
    } else if (command === 'orderedList') {
      document.execCommand('insertOrderedList', false);
    } else if (command === 'unorderedList') {
      document.execCommand('insertUnorderedList', false);
    } else if (command === 'removeList') {
      if (document.queryCommandState('insertOrderedList')) {
        document.execCommand('insertOrderedList', false);
      }
      if (document.queryCommandState('insertUnorderedList')) {
        document.execCommand('insertUnorderedList', false);
      }
      const listEl = parentEl?.closest('ol, ul');
      if (listEl && editorRef.current.contains(listEl)) {
        const fragment = document.createDocumentFragment();
        Array.from(listEl.children).forEach((li) => {
          const p = document.createElement('p');
          while (li.firstChild) p.appendChild(li.firstChild);
          fragment.appendChild(p);
        });
        listEl.parentNode?.replaceChild(fragment, listEl);
      }
    } else if (command === 'blockquote') {
      const quoteEl = parentEl?.closest('blockquote');

      if (quoteEl && editorRef.current.contains(quoteEl)) {
        // Toggle OFF: convert blockquote back to paragraph
        const p = document.createElement('p');
        while (quoteEl.firstChild) p.appendChild(quoteEl.firstChild);
        quoteEl.parentNode?.replaceChild(p, quoteEl);
      } else {
        // Toggle ON: format as blockquote
        document.execCommand('formatBlock', false, 'blockquote');
      }
    }

    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }

    handleInput();
    pushHistory(editorRef.current.innerHTML);
  };

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+X, Ctrl+C, Ctrl+B, Ctrl+I, etc.)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (isCtrlOrCmd) {
      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z (without Shift)
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Cut: Ctrl+X
      if (key === 'x') {
        if (editorRef.current) {
          pushHistory(editorRef.current.innerHTML);
        }
        setTimeout(handleInput, 10);
        return;
      }

      // Copy: Ctrl+C (let native browser copy text cleanly)
      if (key === 'c') {
        return;
      }

      // Bold: Ctrl+B
      if (key === 'b') {
        e.preventDefault();
        handleFormat('bold');
        return;
      }

      // Italic: Ctrl+I
      if (key === 'i') {
        e.preventDefault();
        handleFormat('italic');
        return;
      }

      // Underline: Ctrl+U
      if (key === 'u' && !e.shiftKey) {
        e.preventDefault();
        if (editorRef.current) {
          pushHistory(editorRef.current.innerHTML);
        }
        document.execCommand('underline', false);
        handleInput();
        return;
      }

      // Strikethrough: Ctrl+Shift+S or Ctrl+Shift+X
      if (e.shiftKey && (key === 's' || key === 'x')) {
        e.preventDefault();
        handleFormat('strike');
        return;
      }

      // Numbered List: Ctrl+Shift+7
      if (e.shiftKey && (key === '7' || key === '&')) {
        e.preventDefault();
        handleFormat('orderedList');
        return;
      }

      // Bulleted List: Ctrl+Shift+8
      if (e.shiftKey && (key === '8' || key === '*')) {
        e.preventDefault();
        handleFormat('unorderedList');
        return;
      }

      // Quote: Ctrl+Shift+9 or Ctrl+Shift+Q
      if (e.shiftKey && (key === '9' || key === '(' || key === 'q')) {
        e.preventDefault();
        handleFormat('blockquote');
        return;
      }
    }

    // On Enter or Space, push history immediately for word-boundary undo
    if (e.key === 'Enter' || e.key === ' ') {
      if (editorRef.current) {
        pushHistory(editorRef.current.innerHTML);
      }
    }
  };

  // Handle clean pasting
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (editorRef.current) {
      pushHistory(editorRef.current.innerHTML);
    }
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
    if (editorRef.current) {
      pushHistory(editorRef.current.innerHTML);
    }
  };

  // Handle text color changes with range restoration
  const handleColorChange = (color: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    pushHistory(editorRef.current.innerHTML);

    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    const hex = rgbToHex(color);
    document.execCommand('foreColor', false, hex);
    setActiveColor(hex);
    handleInput();

    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }

    pushHistory(editorRef.current.innerHTML);
  };

  const handleResetColor = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    pushHistory(editorRef.current.innerHTML);

    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    if (!sel || !sel.rangeCount) return;

    // Use a unique sentinel marker color to isolate selected nodes in Chromium/WebKit
    const MARKER = '#000001';
    document.execCommand('foreColor', false, MARKER);

    if (editorRef.current) {
      // Find all elements styled with the marker
      const markers = editorRef.current.querySelectorAll<HTMLElement>(
        'font[color="#000001"], font[color="#00001"], [style*="rgb(0, 0, 1)"], [style*="#000001"]'
      );

      markers.forEach((el) => {
        el.removeAttribute('color');
        el.style.color = '';

        // Strip any inner hardcoded color tags/styles inside this range
        el.querySelectorAll<HTMLElement>('font[color], [style*="color"]').forEach((child) => {
          child.removeAttribute('color');
          child.style.color = '';
        });

        // Unwrap plain font tags that have no size or face attributes left
        if (
          el.tagName.toLowerCase() === 'font' &&
          !el.hasAttribute('size') &&
          !el.hasAttribute('face') &&
          (!el.getAttribute('style') || el.getAttribute('style')?.trim() === '')
        ) {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
        }
      });

      // Clear any parent font color / style wrapping the current selection
      const range = sel.getRangeAt(0);
      let curr: HTMLElement | null =
        range.commonAncestorContainer instanceof HTMLElement
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;

      while (curr && curr !== editorRef.current && editorRef.current.contains(curr)) {
        if (curr.tagName.toLowerCase() === 'font' && curr.hasAttribute('color')) {
          curr.removeAttribute('color');
        }
        if (curr.style.color) {
          curr.style.color = '';
        }
        curr = curr.parentElement;
      }
    }

    setActiveColor('');
    handleInput();
    updateSelectionState();

    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }

    pushHistory(editorRef.current.innerHTML);
  };

  // Handle Font Size changes
  const handleFontSizeChange = (size: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    pushHistory(editorRef.current.innerHTML);

    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    if (!sel || !sel.rangeCount) return;

    // Use fontSize command with dummy size '7'
    document.execCommand('fontSize', false, '7');

    // Replace all font[size="7"] with <span style="font-size: ${size}px">
    const fontTags = editorRef.current.querySelectorAll('font[size="7"]');
    const createdSpans: HTMLElement[] = [];

    fontTags.forEach((font) => {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      if (font.getAttribute('color')) {
        span.style.color = font.getAttribute('color')!;
      }
      // Clear inner font-size spans so selection becomes uniform
      font.querySelectorAll('span').forEach((innerSpan) => {
        (innerSpan as HTMLElement).style.fontSize = '';
      });
      while (font.firstChild) {
        span.appendChild(font.firstChild);
      }
      font.parentNode?.replaceChild(span, font);
      createdSpans.push(span);
    });

    // Re-select newly styled spans to keep selection alive and accurate
    if (createdSpans.length > 0 && sel) {
      const newRange = document.createRange();
      newRange.setStartBefore(createdSpans[0]);
      newRange.setEndAfter(createdSpans[createdSpans.length - 1]);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();
    }

    setActiveFormats((prev) => ({ ...prev, fontSize: size }));
    handleInput();
    updateSelectionState();
    pushHistory(editorRef.current.innerHTML);
  };

  // Handle Line Spacing changes
  const handleLineSpacingChange = (spacing: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    pushHistory(editorRef.current.innerHTML);

    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    const blocks: HTMLElement[] = [];
    const startEl =
      range.startContainer instanceof HTMLElement
        ? range.startContainer
        : range.startContainer.parentElement;
    const endEl =
      range.endContainer instanceof HTMLElement
        ? range.endContainer
        : range.endContainer.parentElement;

    const startBlock = startEl?.closest('p, li, blockquote') as HTMLElement | null;
    const endBlock = endEl?.closest('p, li, blockquote') as HTMLElement | null;

    if (startBlock && endBlock && startBlock === endBlock && editorRef.current.contains(startBlock)) {
      blocks.push(startBlock);
    } else {
      const allBlocks = editorRef.current.querySelectorAll('p, li, blockquote');
      allBlocks.forEach((node) => {
        const el = node as HTMLElement;
        if (
          sel.containsNode(el, true) ||
          el.contains(range.startContainer) ||
          el.contains(range.endContainer)
        ) {
          blocks.push(el);
        }
      });
    }

    if (blocks.length === 0) {
      document.execCommand('formatBlock', false, 'p');
      const updatedSel = window.getSelection();
      if (updatedSel && updatedSel.rangeCount) {
        const p = updatedSel.getRangeAt(0).commonAncestorContainer;
        const pEl = (p instanceof HTMLElement ? p : p?.parentElement)?.closest('p, li, blockquote') as HTMLElement | null;
        if (pEl && editorRef.current.contains(pEl)) {
          blocks.push(pEl);
        }
      }
    }

    blocks.forEach((block) => {
      block.style.lineHeight = spacing;
    });

    handleInput();
    updateSelectionState();
    pushHistory(editorRef.current.innerHTML);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // If focus moves to any element inside containerRef (like color popover, input), do NOT hide toolbar!
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setTimeout(() => {
      if (containerRef.current && containerRef.current.contains(document.activeElement)) {
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setToolbarPosition(null);
      }
    }, 250);
  };

  return (
    <div ref={containerRef} className="relative w-full group">
      {/* Floating Text Modifier Toolbar (4 visible features + 3-dot More menu) */}
      <TextModifierToolbar
        position={toolbarPosition}
        activeFormats={activeFormats}
        onFormat={handleFormat}
        activeColor={activeColor}
        onColorChange={handleColorChange}
        onResetColor={handleResetColor}
        onFontSizeChange={handleFontSizeChange}
        onLineSpacingChange={handleLineSpacingChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Contenteditable Rich Text Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseUp={updateSelectionState}
        onKeyUp={updateSelectionState}
        onScroll={updateSelectionState}
        onBlur={handleBlur}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className={`description-editor w-full min-h-[110px] max-h-[135px] overflow-y-auto no-scrollbar p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans leading-relaxed ${className}`}
      />

      {/* Placeholder Display when empty */}
      {isEmpty && (
        <div
          onClick={() => editorRef.current?.focus()}
          className="absolute top-3 left-3 text-slate-400 text-sm pointer-events-none select-none font-medium"
        >
          {placeholder}
        </div>
      )}

      {/* Scoped CSS for elements inside the rich description editor */}
      <style>{`
        .description-editor::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        [contenteditable] blockquote {
          border-left: 3px solid #3b82f6;
          padding-left: 0.75rem;
          margin: 0.35rem 0;
          font-style: italic;
          background-color: rgba(59, 130, 246, 0.08);
          border-radius: 0 0.375rem 0.375rem 0;
        }
        [contenteditable] ul {
          list-style-type: disc !important;
          padding-left: 1.4rem !important;
          margin: 0.35rem 0 !important;
        }
        [contenteditable] ol {
          list-style-type: decimal !important;
          padding-left: 1.4rem !important;
          margin: 0.35rem 0 !important;
        }
        [contenteditable] li {
          margin: 0.2rem 0 !important;
        }
        [contenteditable] code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background-color: rgba(148, 163, 184, 0.2);
          padding: 0.15rem 0.35rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
        }
        :where(.dark, .dark *) [contenteditable] code {
          background-color: rgba(51, 65, 85, 0.5);
          color: #f472b6;
        }

        /* ─── Light & Dark Theme Contrast Safeguards for Editor ─── */
        /* Light Theme: White, off-white, and faint slate text must adapt to high-contrast dark text */
        :not(.dark) [contenteditable] font[color="#ffffff" i],
        :not(.dark) [contenteditable] font[color="#ffffff" i] *,
        :not(.dark) [contenteditable] font[color="#fff" i],
        :not(.dark) [contenteditable] font[color="#fff" i] *,
        :not(.dark) [contenteditable] font[color="#94a3b8" i],
        :not(.dark) [contenteditable] font[color="#94a3b8" i] *,
        :not(.dark) [contenteditable] font[color="#cbd5e1" i],
        :not(.dark) [contenteditable] font[color="#cbd5e1" i] *,
        :not(.dark) [contenteditable] font[color="#e2e8f0" i],
        :not(.dark) [contenteditable] font[color="#e2e8f0" i] *,
        :not(.dark) [contenteditable] font[color="#f8fafc" i],
        :not(.dark) [contenteditable] font[color="#f8fafc" i] *,
        :not(.dark) [contenteditable] font[color="#f1f5f9" i],
        :not(.dark) [contenteditable] font[color="#f1f5f9" i] *,
        :not(.dark) [contenteditable] [style*="color: #ffffff" i],
        :not(.dark) [contenteditable] [style*="color: #fff" i],
        :not(.dark) [contenteditable] [style*="color: #94a3b8" i],
        :not(.dark) [contenteditable] [style*="color: #cbd5e1" i],
        :not(.dark) [contenteditable] [style*="color: #e2e8f0" i],
        :not(.dark) [contenteditable] [style*="color: #f8fafc" i],
        :not(.dark) [contenteditable] [style*="color: rgb(255, 255, 255)"],
        :not(.dark) [contenteditable] [style*="color: rgb(148, 163, 184)"],
        :not(.dark) [contenteditable] [style*="color: rgb(203, 213, 225)"] {
          color: #0f172a !important;
        }

        /* Dark Theme: Black and deep dark slate text must adapt to high-contrast white text */
        :where(.dark, .dark *) [contenteditable] font[color="#000000" i],
        :where(.dark, .dark *) [contenteditable] font[color="#000000" i] *,
        :where(.dark, .dark *) [contenteditable] font[color="#000" i],
        :where(.dark, .dark *) [contenteditable] font[color="#000" i] *,
        :where(.dark, .dark *) [contenteditable] font[color="#0f172a" i],
        :where(.dark, .dark *) [contenteditable] font[color="#0f172a" i] *,
        :where(.dark, .dark *) [contenteditable] font[color="#1e293b" i],
        :where(.dark, .dark *) [contenteditable] font[color="#1e293b" i] *,
        :where(.dark, .dark *) [contenteditable] font[color="#334155" i],
        :where(.dark, .dark *) [contenteditable] font[color="#334155" i] *,
        :where(.dark, .dark *) [contenteditable] font[color="#475569" i],
        :where(.dark, .dark *) [contenteditable] font[color="#475569" i] *,
        :where(.dark, .dark *) [contenteditable] [style*="color: #000000" i],
        :where(.dark, .dark *) [contenteditable] [style*="color: #000" i],
        :where(.dark, .dark *) [contenteditable] [style*="color: #0f172a" i],
        :where(.dark, .dark *) [contenteditable] [style*="color: #1e293b" i],
        :where(.dark, .dark *) [contenteditable] [style*="color: #334155" i],
        :where(.dark, .dark *) [contenteditable] [style*="color: #475569" i],
        :where(.dark, .dark *) [contenteditable] [style*="color: rgb(0, 0, 0)"],
        :where(.dark, .dark *) [contenteditable] [style*="color: rgb(15, 23, 42)"],
        :where(.dark, .dark *) [contenteditable] [style*="color: rgb(30, 41, 59)"],
        :where(.dark, .dark *) [contenteditable] [style*="color: rgb(71, 85, 105)"] {
          color: #f8fafc !important;
        }

        .hue-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #111b21;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
        .hue-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #111b21;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
