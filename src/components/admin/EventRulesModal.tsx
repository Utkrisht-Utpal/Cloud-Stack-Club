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
  Baseline,
  AlignJustify,
} from 'lucide-react';
import { Modal } from '../ui/Modal';

interface EventRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
  initialRules?: string;
  onSave: (rules: string) => void;
}

const MAX_RULES_LENGTH = 5000;

// Predefined text color palette for the color picker
const TEXT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'White', value: '#ffffff' },
  { name: 'Silver', value: '#94a3b8' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Sky', value: '#38bdf8' },
];

// Escape HTML special characters for safe conversion
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Sanitize HTML strictly allowing only formatting and list tags/attributes
const sanitizeRulesHtml = (html: string): string => {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Elements to remove completely along with their children
  const removeElements = doc.querySelectorAll(
    'script, style, iframe, object, embed, svg, img, video, audio, form, input, button, select, textarea'
  );
  removeElements.forEach((el) => el.remove());

  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'span',
    'ul',
    'ol',
    'li',
  ]);

  const sanitizeElement = (el: HTMLElement) => {
    const tag = el.tagName.toLowerCase();

    // Convert div to p so paragraph structure is cleanly preserved
    if (tag === 'div') {
      const p = doc.createElement('p');
      if (el.hasAttribute('data-font-size')) {
        p.setAttribute('data-font-size', el.getAttribute('data-font-size')!);
      }
      if (el.hasAttribute('data-line-spacing')) {
        p.setAttribute('data-line-spacing', el.getAttribute('data-line-spacing')!);
      }
      if (el.hasAttribute('style')) {
        p.setAttribute('style', el.getAttribute('style')!);
      }
      while (el.firstChild) p.appendChild(el.firstChild);
      el.parentNode?.replaceChild(p, el);
      sanitizeElement(p);
      return;
    }

    // Convert headings h1-h6 to p with bold
    if (/^h[1-6]$/.test(tag)) {
      const p = doc.createElement('p');
      p.setAttribute('data-font-size', 'large');
      p.setAttribute('style', 'font-size: 1.125rem; line-height: 1.6rem;');
      const strong = doc.createElement('strong');
      while (el.firstChild) strong.appendChild(el.firstChild);
      p.appendChild(strong);
      el.parentNode?.replaceChild(p, el);
      sanitizeElement(p);
      return;
    }

    // Convert <font color="X"> (created by execCommand foreColor) to <span style="color: X">
    if (tag === 'font') {
      const span = doc.createElement('span');
      const colorAttr = el.getAttribute('color');
      if (colorAttr) {
        span.setAttribute('style', `color: ${colorAttr};`);
      }
      while (el.firstChild) span.appendChild(el.firstChild);
      el.parentNode?.replaceChild(span, el);
      sanitizeElement(span);
      return;
    }

    // If not in allowed list, unwrap children into parent
    if (!allowedTags.has(tag)) {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
      return;
    }

    // Filter attributes: remove event handlers and untrusted attributes
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
        return;
      }

      if (tag === 'ul' || tag === 'ol') {
        if (name === 'data-list-type') {
          const valid = ['bullet', 'numbered', 'checklist', 'arrow'].includes(
            attr.value.toLowerCase()
          );
          if (!valid) el.removeAttribute(attr.name);
        } else {
          el.removeAttribute(attr.name);
        }
      } else if (tag === 'span' || tag === 'p' || tag === 'li') {
        if (name === 'data-font-size') {
          const valid = ['small', 'normal', 'large'].includes(
            attr.value.toLowerCase()
          );
          if (!valid) el.removeAttribute(attr.name);
        } else if (name === 'data-line-spacing') {
          const valid = ['1', '1.5', '2', '2.5'].includes(attr.value);
          if (!valid) el.removeAttribute(attr.name);
        } else if (name === 'style') {
          // Reconstruct only safe style properties
          let cleanStyle = '';
          const rawStyle = attr.value;
          // Preserve font-size
          if (rawStyle.toLowerCase().includes('0.75rem') || rawStyle.toLowerCase().includes('12px')) {
            cleanStyle += 'font-size: 0.75rem; line-height: 1.25rem; ';
          } else if (rawStyle.toLowerCase().includes('1.125rem') || rawStyle.toLowerCase().includes('18px')) {
            cleanStyle += 'font-size: 1.125rem; line-height: 1.6rem; ';
          }
          // Preserve color (safe CSS values only: hex, rgb, rgba, named)
          const colorMatch = rawStyle.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
          if (colorMatch) {
            const colorVal = colorMatch[1].trim();
            // Only allow safe color values
            if (/^(#[0-9a-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|[a-z]+)$/i.test(colorVal)) {
              cleanStyle += `color: ${colorVal}; `;
            }
          }
          if (cleanStyle) {
            el.setAttribute('style', cleanStyle.trim());
          } else {
            el.removeAttribute(attr.name);
          }
        } else {
          el.removeAttribute(attr.name);
        }
      } else {
        el.removeAttribute(attr.name);
      }
    });

    // Ensure list elements have data-list-type attribute
    if (tag === 'ol' && !el.hasAttribute('data-list-type')) {
      el.setAttribute('data-list-type', 'numbered');
    } else if (tag === 'ul' && !el.hasAttribute('data-list-type')) {
      el.setAttribute('data-list-type', 'bullet');
    }

    // Process children recursively
    const children = Array.from(el.children);
    children.forEach((child) => sanitizeElement(child as HTMLElement));
  };

  Array.from(doc.body.children).forEach((child) =>
    sanitizeElement(child as HTMLElement)
  );

  // Remove empty list items that have no text content
  doc.querySelectorAll('li').forEach((li) => {
    if (!li.textContent?.trim()) {
      li.remove();
    }
  });

  // Remove empty lists that have no remaining li elements
  doc.querySelectorAll('ul, ol').forEach((list) => {
    if (!list.querySelector('li')) {
      list.remove();
    }
  });

  return doc.body.innerHTML;
};

// Clean pasted HTML from Word, Google Docs, external sites
const cleanPastedHtml = (html: string): string => {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Strip scripts, styles, meta, comments
  doc.querySelectorAll('script, style, meta, link, xml').forEach((el) => el.remove());

  // Replace b/strong/em/i/u/lists
  const walk = (el: HTMLElement) => {
    const tag = el.tagName.toLowerCase();
    const style = el.getAttribute('style') || '';
    const isBold =
      tag === 'b' ||
      tag === 'strong' ||
      /font-weight\s*:\s*(bold|[7-9]00)/i.test(style);
    const isItalic =
      tag === 'i' ||
      tag === 'em' ||
      /font-style\s*:\s*italic/i.test(style);
    const isUnderline =
      tag === 'u' ||
      /text-decoration\s*:\s*underline/i.test(style);

    // Process children first
    Array.from(el.children).forEach((child) => walk(child as HTMLElement));

    // Simplify spans
    if (tag === 'span' || tag === 'font') {
      let wrapper: HTMLElement | null = null;
      if (isBold) wrapper = doc.createElement('strong');
      else if (isItalic) wrapper = doc.createElement('em');
      else if (isUnderline) wrapper = doc.createElement('u');
      else {
        const fontSizeAttr = el.getAttribute('data-font-size');
        const isSmall =
          fontSizeAttr === 'small' ||
          style.includes('12px') ||
          style.includes('0.75rem');
        const isLarge =
          fontSizeAttr === 'large' ||
          style.includes('18px') ||
          style.includes('1.125rem');
        if (isSmall || isLarge) {
          wrapper = doc.createElement('span');
          const chosenSize = isSmall ? 'small' : 'large';
          wrapper.setAttribute('data-font-size', chosenSize);
          wrapper.setAttribute(
            'style',
            chosenSize === 'small'
              ? 'font-size: 0.75rem; line-height: 1.25rem;'
              : 'font-size: 1.125rem; line-height: 1.6rem;'
          );
        }
      }

      if (wrapper) {
        while (el.firstChild) wrapper.appendChild(el.firstChild);
        el.parentNode?.replaceChild(wrapper, el);
      } else {
        // Unwrap plain span
        const frag = doc.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.parentNode?.replaceChild(frag, el);
      }
      return;
    }

    // Keep lists and paragraphs, strip external classes and strange styles
    el.removeAttribute('class');
    el.removeAttribute('id');
    el.removeAttribute('style');
    el.removeAttribute('color');
    el.removeAttribute('face');
    el.removeAttribute('size');
  };

  Array.from(doc.body.children).forEach((child) => walk(child as HTMLElement));
  return sanitizeRulesHtml(doc.body.innerHTML);
};

// Convert legacy plain text (with bullets/numbers) into structured HTML
const convertPlainTextToHtml = (plain: string): string => {
  if (!plain || !plain.trim()) return '';
  const lines = plain.split(/\r?\n/);
  let html = '';
  let currentListType: 'bullet' | 'numbered' | 'checklist' | 'arrow' | null = null;

  const closeList = () => {
    if (currentListType) {
      html += currentListType === 'numbered' ? '</ol>' : '</ul>';
      currentListType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      html += '<p><br></p>';
      continue;
    }

    if (/^[•\-\*]\s*/.test(line)) {
      if (currentListType !== 'bullet') {
        closeList();
        html += '<ul data-list-type="bullet">';
        currentListType = 'bullet';
      }
      const content = line.replace(/^[•\-\*]\s*/, '');
      html += `<li>${escapeHtml(content)}</li>`;
    } else if (/^(\d+)[\.\)]\s*/.test(line)) {
      if (currentListType !== 'numbered') {
        closeList();
        html += '<ol data-list-type="numbered">';
        currentListType = 'numbered';
      }
      const content = line.replace(/^(\d+)[\.\)]\s*/, '');
      html += `<li>${escapeHtml(content)}</li>`;
    } else if (/^(☑|\[[ xX]\])\s*/.test(line)) {
      if (currentListType !== 'checklist') {
        closeList();
        html += '<ul data-list-type="checklist">';
        currentListType = 'checklist';
      }
      const content = line.replace(/^(☑|\[[ xX]\])\s*/, '');
      html += `<li>${escapeHtml(content)}</li>`;
    } else if (/^(→|->|=>)\s*/.test(line)) {
      if (currentListType !== 'arrow') {
        closeList();
        html += '<ul data-list-type="arrow">';
        currentListType = 'arrow';
      }
      const content = line.replace(/^(→|->|=>)\s*/, '');
      html += `<li>${escapeHtml(content)}</li>`;
    } else {
      closeList();
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }

  closeList();
  return html;
};

// Helper to find closest element with given tag name
const findClosestTag = (
  node: Node | null,
  tagName: string,
  root: HTMLElement
): HTMLElement | null => {
  let curr: Node | null = node;
  while (curr && curr !== root) {
    if (
      curr.nodeType === Node.ELEMENT_NODE &&
      (curr as HTMLElement).tagName === tagName
    ) {
      return curr as HTMLElement;
    }
    curr = curr.parentNode;
  }
  return null;
};

// Helper to find closest block element inside editor
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

// Split a block (e.g. <p>) containing <br> tags into multiple blocks of the same type
const splitElementByBr = (element: HTMLElement): HTMLElement[] => {
  if (!element.querySelector('br')) return [element];
  const text = element.textContent || '';
  if (!text.trim()) return [element];

  const blocks: HTMLElement[] = [];
  let currentBlock = document.createElement(element.tagName.toLowerCase());
  Array.from(element.attributes).forEach((attr) => {
    currentBlock.setAttribute(attr.name, attr.value);
  });

  const appendToCurrent = (node: Node) => {
    currentBlock.appendChild(node.cloneNode(true));
  };

  const flush = () => {
    if (currentBlock.childNodes.length === 0) {
      currentBlock.innerHTML = '<br>';
    }
    blocks.push(currentBlock);
    currentBlock = document.createElement(element.tagName.toLowerCase());
    Array.from(element.attributes).forEach((attr) => {
      currentBlock.setAttribute(attr.name, attr.value);
    });
  };

  const processNode = (node: Node, inlineWrappers: HTMLElement[] = []) => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).tagName.toLowerCase() === 'br'
    ) {
      flush();
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.querySelector('br')) {
        const wrapper = el.cloneNode(false) as HTMLElement;
        Array.from(el.childNodes).forEach((child) => {
          processNode(child, [...inlineWrappers, wrapper]);
        });
        return;
      }
    }

    if (inlineWrappers.length === 0) {
      appendToCurrent(node);
    } else {
      const rootWrap = inlineWrappers[0].cloneNode(false) as HTMLElement;
      let leaf: HTMLElement = rootWrap;
      for (let i = 1; i < inlineWrappers.length; i++) {
        const nextWrap = inlineWrappers[i].cloneNode(false) as HTMLElement;
        leaf.appendChild(nextWrap);
        leaf = nextWrap;
      }
      leaf.appendChild(node.cloneNode(true));
      currentBlock.appendChild(rootWrap);
    }
  };

  Array.from(element.childNodes).forEach((child) => processNode(child));
  if (currentBlock.childNodes.length > 0 && currentBlock.textContent?.trim() !== '') {
    blocks.push(currentBlock);
  } else if (blocks.length === 0) {
    currentBlock.innerHTML = '<br>';
    blocks.push(currentBlock);
  }

  return blocks;
};

// Check if a block element intersects the user's current selection range
const isBlockSelected = (block: HTMLElement, range: Range): boolean => {
  if (range.collapsed) {
    return block.contains(range.startContainer) || block === range.startContainer;
  }

  try {
    if (!range.intersectsNode(block)) return false;
  } catch {
    return false;
  }

  const startsInBlock =
    block.contains(range.startContainer) || block === range.startContainer;
  const endsInBlock =
    block.contains(range.endContainer) || block === range.endContainer;

  if (endsInBlock && !startsInBlock) {
    if (range.endOffset === 0) {
      if (range.endContainer === block) return false;
      let firstLeaf: Node | null = block;
      while (firstLeaf && firstLeaf.firstChild) {
        firstLeaf = firstLeaf.firstChild;
      }
      if (range.endContainer === firstLeaf) return false;
    }
  }

  return true;
};

// Normalize top-level loose text/inline nodes and <div> elements into <p>
const normalizeTopLevelBlocks = (root: HTMLElement) => {
  const childNodes = Array.from(root.childNodes);
  let inlineGroup: Node[] = [];

  const flush = () => {
    if (inlineGroup.length === 0) return;
    const p = document.createElement('p');
    root.insertBefore(p, inlineGroup[0]);
    inlineGroup.forEach((n) => p.appendChild(n));
    inlineGroup = [];
  };

  childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      inlineGroup.push(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const isBlock = [
        'p',
        'div',
        'ul',
        'ol',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
      ].includes(tag);
      if (isBlock) {
        flush();
        if (tag === 'div') {
          const p = document.createElement('p');
          if (el.hasAttribute('data-font-size')) {
            p.setAttribute('data-font-size', el.getAttribute('data-font-size')!);
          }
          if (el.hasAttribute('style')) {
            p.setAttribute('style', el.getAttribute('style')!);
          }
          while (el.firstChild) p.appendChild(el.firstChild);
          root.replaceChild(p, el);
        }
      } else {
        inlineGroup.push(node);
      }
    }
  });
  flush();
};

// Retrieve all candidate line blocks in document order (<p> blocks and <li> list items)
const getCandidateBlocks = (root: HTMLElement): HTMLElement[] => {
  const blocks: HTMLElement[] = [];
  Array.from(root.children).forEach((child) => {
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
  return blocks;
};

export const EventRulesModal: React.FC<EventRulesModalProps> = ({
  isOpen,
  onClose,
  eventTitle = 'Event',
  initialRules = '',
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lineSpacingRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const preferredFontSizeRef = useRef<'small' | 'normal' | 'large'>('normal');

  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Formatting state for active button highlights
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [activeFontSize, setActiveFontSize] = useState<
    'small' | 'normal' | 'large'
  >('normal');
  const [activeListType, setActiveListType] = useState<
    'bullet' | 'numbered' | 'checklist' | 'arrow' | null
  >(null);
  const [activeColor, setActiveColor] = useState<string>('');
  const [activeLineSpacing, setActiveLineSpacing] = useState<'1' | '1.5' | '2' | '2.5'>('1.5');

  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isLineSpacingOpen, setIsLineSpacingOpen] = useState(false);
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

  // Calculate visible textual length (excluding HTML tags/styling)
  const getVisibleTextLength = useCallback((): number => {
    if (!editorRef.current) return 0;
    return (editorRef.current.textContent || '').length;
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
      // Ignored if selection is not in document
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
      if (type === 'numbered' || parentList.tagName === 'OL') {
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
      const rawText = editorRef.current.textContent || '';
      const block = findClosestBlock(sel.anchorNode, editorRef.current);
      const isBlockEmpty =
        !block || !block.textContent || !block.textContent.trim();

      if (
        (!rawText.trim() || isBlockEmpty) &&
        preferredFontSizeRef.current !== 'normal'
      ) {
        setActiveFontSize(preferredFontSizeRef.current);
      } else {
        setActiveFontSize('normal');
        preferredFontSizeRef.current = 'normal';
      }
    }

    // Detect active text color (walk up from cursor)
    let colorNode: Node | null = sel.anchorNode;
    let detectedColor = '';
    while (colorNode && colorNode !== editorRef.current) {
      if (colorNode.nodeType === Node.ELEMENT_NODE) {
        const el = colorNode as HTMLElement;
        // Check for <font color="..."> (created by execCommand before sanitization)
        if (el.tagName.toLowerCase() === 'font') {
          detectedColor = el.getAttribute('color') || '';
          break;
        }
        // Check for color in style attribute
        const styleAttr = el.getAttribute('style') || '';
        const colorMatch = styleAttr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
        if (colorMatch) {
          detectedColor = colorMatch[1].trim();
          break;
        }
      }
      colorNode = colorNode.parentNode;
    }
    setActiveColor(detectedColor);

    // Detect active line spacing (walk up from cursor to find block with data-line-spacing)
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
  }, [saveCurrentRange]);

  // Synchronize state and character limit
  const updateEditorState = useCallback(() => {
    const len = getVisibleTextLength();
    setCharCount(len);
    if (len <= MAX_RULES_LENGTH) {
      setError(null);
    }
    updateActiveFormatting();
  }, [getVisibleTextLength, updateActiveFormatting]);

  // Input handler to preserve preferred font size when erasing content
  const handleInput = useCallback(() => {
    setIsPlaceholderDismissed(true);

    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      const pref = preferredFontSizeRef.current;

      if (!text.trim()) {
        if (pref !== 'normal') {
          const firstChild = editorRef.current.firstElementChild as HTMLElement | null;
          const isSingleP =
            editorRef.current.children.length === 1 &&
            firstChild?.tagName.toLowerCase() === 'p';

          if (!isSingleP || firstChild?.getAttribute('data-font-size') !== pref) {
            const p = document.createElement('p');
            p.setAttribute('data-font-size', pref);
            p.setAttribute(
              'style',
              pref === 'small'
                ? 'font-size: 0.75rem; line-height: 1.25rem;'
                : 'font-size: 1.125rem; line-height: 1.6rem;'
            );
            p.innerHTML = '<br>';
            editorRef.current.innerHTML = '';
            editorRef.current.appendChild(p);

            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              range.setStart(p, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        }
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
          const block = findClosestBlock(sel.anchorNode, editorRef.current);
          if (
            block &&
            block !== editorRef.current &&
            (!block.textContent || !block.textContent.trim()) &&
            pref !== 'normal'
          ) {
            if (block.getAttribute('data-font-size') !== pref) {
              block.setAttribute('data-font-size', pref);
              block.setAttribute(
                'style',
                pref === 'small'
                  ? 'font-size: 0.75rem; line-height: 1.25rem;'
                  : 'font-size: 1.125rem; line-height: 1.6rem;'
              );
            }
          }
        }
      }
    }

    updateEditorState();
  }, [updateEditorState]);

  // Callback ref to guarantee rich HTML is immediately loaded when mounted in modal portal
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
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch {
        // Ignored
      }
    }
  }, [isOpen, initialRules]);

  // Close font size dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsFontDropdownOpen(false);
      }
    };
    if (isFontDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFontDropdownOpen]);

  // Close color picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
    };
    if (isColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen]);

  // Close line spacing dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        lineSpacingRef.current &&
        !lineSpacingRef.current.contains(e.target as Node)
      ) {
        setIsLineSpacingOpen(false);
      }
    };
    if (isLineSpacingOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLineSpacingOpen]);

  // Format toggles
  const handleToggleFormat = (command: 'bold' | 'italic' | 'underline') => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();
    document.execCommand(command, false);
    saveCurrentRange();
    updateEditorState();
  };


  // Apply text color to selection
  const handleApplyColor = (color: string) => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();

    if (!color) {
      // Remove color: apply 'inherit' which neutralizes custom color
      document.execCommand('foreColor', false, 'inherit');
      // Walk selection and strip any explicit color style/attribute
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        const range = sel.getRangeAt(0);
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_ELEMENT
        );
        const toStrip: HTMLElement[] = [];
        let curr = walker.nextNode();
        while (curr) {
          const el = curr as HTMLElement;
          if (range.intersectsNode(el)) {
            const style = el.getAttribute('style') || '';
            if (/color\s*:/i.test(style)) toStrip.push(el);
            if (el.tagName.toLowerCase() === 'font' && el.getAttribute('color')) toStrip.push(el);
          }
          curr = walker.nextNode();
        }
        toStrip.forEach(el => {
          if (el.tagName.toLowerCase() === 'font') {
            el.removeAttribute('color');
          } else {
            const cleaned = (el.getAttribute('style') || '').replace(/(?:^|;)\s*color\s*:[^;]*/gi, '').trim().replace(/^;/, '').trim();
            if (cleaned) {
              el.setAttribute('style', cleaned);
            } else {
              el.removeAttribute('style');
            }
          }
        });
      }
    } else {
      document.execCommand('foreColor', false, color);
    }

    saveCurrentRange();
    setActiveColor(color);
    setIsColorPickerOpen(false);
    updateEditorState();
  };

  // Apply line spacing to all selected blocks
  const handleApplyLineSpacing = (spacing: '1' | '1.5' | '2' | '2.5') => {
    if (!editorRef.current) return;
    restoreSavedRange();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const allCandidates = getCandidateBlocks(editorRef.current);

    let targetBlocks: HTMLElement[];
    if (range.collapsed) {
      const block = findClosestBlock(sel.anchorNode, editorRef.current);
      targetBlocks = block && block !== editorRef.current ? [block] : [];
    } else {
      targetBlocks = allCandidates.filter((b) => isBlockSelected(b, range));
      if (targetBlocks.length === 0) {
        const block = findClosestBlock(range.startContainer, editorRef.current);
        if (block && block !== editorRef.current) targetBlocks = [block];
      }
    }

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

  // Font size handler
  const handleApplyFontSize = (size: 'small' | 'normal' | 'large') => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();
    preferredFontSizeRef.current = size;

    let sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current?.contains(sel.anchorNode)) {
      if (editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }

    sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);

    // If editor is completely empty, initialize paragraph with selected font size
    const rawText = editorRef.current.textContent || '';
    if (!rawText.trim() && editorRef.current.querySelectorAll('p, li, div').length <= 1) {
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
      // TEXT IS SELECTED:
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

        if (size === 'normal') {
          let curr: Node | null = sel.anchorNode;
          while (curr && curr !== editorRef.current) {
            if (
              curr.nodeType === Node.ELEMENT_NODE &&
              (curr as HTMLElement).hasAttribute('data-font-size')
            ) {
              (curr as HTMLElement).removeAttribute('data-font-size');
              (curr as HTMLElement).removeAttribute('style');
            }
            curr = curr.parentNode;
          }
        }
      } else {
        // Fallback: extractContents into a span
        const existingSpan = findClosestTag(sel.anchorNode, 'SPAN', editorRef.current);
        if (existingSpan && existingSpan.getAttribute('data-font-size')) {
          if (size === 'normal') {
            existingSpan.removeAttribute('data-font-size');
            existingSpan.removeAttribute('style');
          } else {
            existingSpan.setAttribute('data-font-size', size);
            existingSpan.setAttribute(
              'style',
              size === 'small'
                ? 'font-size: 0.75rem; line-height: 1.25rem;'
                : 'font-size: 1.125rem; line-height: 1.6rem;'
            );
          }
        } else if (size !== 'normal') {
          const span = document.createElement('span');
          span.setAttribute('data-font-size', size);
          span.setAttribute(
            'style',
            size === 'small'
              ? 'font-size: 0.75rem; line-height: 1.25rem;'
              : 'font-size: 1.125rem; line-height: 1.6rem;'
          );
          span.appendChild(range.extractContents());
          range.insertNode(span);

          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.addRange(newRange);
        }
      }
    } else {
      // CURSOR IS COLLAPSED (apply to current span or enclosing block):
      const existingSpan = findClosestTag(sel.anchorNode, 'SPAN', editorRef.current);
      if (existingSpan && existingSpan.hasAttribute('data-font-size')) {
        if (size === 'normal') {
          existingSpan.removeAttribute('data-font-size');
          existingSpan.removeAttribute('style');
        } else {
          existingSpan.setAttribute('data-font-size', size);
          existingSpan.setAttribute(
            'style',
            size === 'small'
              ? 'font-size: 0.75rem; line-height: 1.25rem;'
              : 'font-size: 1.125rem; line-height: 1.6rem;'
          );
        }
      } else {
        const block = findClosestBlock(sel.anchorNode, editorRef.current);
        if (block && block !== editorRef.current) {
          if (size === 'normal') {
            block.removeAttribute('data-font-size');
            block.removeAttribute('style');
            block.querySelectorAll('[data-font-size]').forEach((el) => {
              el.removeAttribute('data-font-size');
              el.removeAttribute('style');
            });
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
    }

    saveCurrentRange();
    setActiveFontSize(size);
    setIsFontDropdownOpen(false);
    updateEditorState();
  };

  // List toggle handler supporting multi-line selection, conversion, and toggling off
  const handleToggleList = (
    targetType: 'bullet' | 'numbered' | 'checklist' | 'arrow'
  ) => {
    setIsPlaceholderDismissed(true);
    restoreSavedRange();
    if (!editorRef.current) return;
    editorRef.current.focus();

    // 1. If editor is completely empty, initialize first list item directly
    const rawText = editorRef.current.textContent?.trim() || '';
    const hasLis = editorRef.current.querySelectorAll('li').length > 0;
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

    // 2. Normalize top-level loose text/inline nodes and <div>s to <p>
    normalizeTopLevelBlocks(editorRef.current);

    // 3. Find candidate line blocks and determine which ones are selected
    const allCandidates = getCandidateBlocks(editorRef.current);
    let selectedBlocks: HTMLElement[] = [];

    if (range.collapsed) {
      let targetBlock: HTMLElement | null = null;
      let curr: Node | null = sel.anchorNode;
      while (curr && curr !== editorRef.current) {
        if (curr.nodeType === Node.ELEMENT_NODE) {
          const el = curr as HTMLElement;
          const tag = el.tagName.toLowerCase();
          if (tag === 'li' || el.parentElement === editorRef.current) {
            targetBlock = el;
            break;
          }
        }
        curr = curr.parentNode;
      }
      if (targetBlock) {
        selectedBlocks.push(targetBlock);
      } else if (allCandidates.length > 0) {
        selectedBlocks.push(allCandidates[0]);
      }
    } else {
      allCandidates.forEach((b) => {
        if (isBlockSelected(b, range)) {
          selectedBlocks.push(b);
        }
      });
      if (selectedBlocks.length === 0) {
        const startBlock = findClosestBlock(range.startContainer, editorRef.current);
        if (startBlock && startBlock !== editorRef.current) {
          selectedBlocks.push(startBlock);
        }
      }
    }

    if (selectedBlocks.length === 0) return;

    // 4. If any selected block contains <br> separating text, split it into separate paragraphs
    const expandedBlocks: HTMLElement[] = [];
    selectedBlocks.forEach((block) => {
      if (block.tagName.toLowerCase() !== 'li' && block.querySelector('br')) {
        const splitBlocks = splitElementByBr(block);
        if (splitBlocks.length > 1) {
          const parent = block.parentNode;
          if (parent) {
            const frag = document.createDocumentFragment();
            splitBlocks.forEach((sb) => frag.appendChild(sb));
            parent.replaceChild(frag, block);
          }
          expandedBlocks.push(...splitBlocks);
          return;
        }
      }
      expandedBlocks.push(block);
    });
    selectedBlocks = expandedBlocks;

    // 5. Check if all selected blocks are already in targetType list (TOGGLE OFF check)
    // Only check blocks that have visible text
    const textBlocks = selectedBlocks.filter(
      (b) => (b.textContent || '').trim().length > 0
    );

    const allAreTargetList =
      textBlocks.length > 0 &&
      textBlocks.every((b) => {
        if (b.tagName.toLowerCase() !== 'li') return false;
        const parent = b.parentElement;
        if (!parent) return false;
        const parentType =
          parent.getAttribute('data-list-type') ||
          (parent.tagName.toLowerCase() === 'ol' ? 'numbered' : 'bullet');
        return parentType === targetType;
      });

    if (allAreTargetList) {
      // --- ACTION: TOGGLE OFF LIST (Convert selected <li> to <p>) ---
      const createdParagraphs: HTMLElement[] = [];
      const parentLists = new Set<HTMLElement>();
      selectedBlocks.forEach((b) => {
        if (b.parentElement) parentLists.add(b.parentElement);
      });

      parentLists.forEach((parentList) => {
        const childLis = Array.from(parentList.children) as HTMLElement[];
        const parentOfList = parentList.parentNode;
        if (!parentOfList) return;

        const frag = document.createDocumentFragment();
        let currentSubList: HTMLElement | null = null;

        childLis.forEach((li) => {
          const hasText = (li.textContent || '').trim().length > 0;
          if (selectedBlocks.includes(li)) {
            currentSubList = null;
            if (hasText) {
              const p = document.createElement('p');
              p.innerHTML = li.innerHTML || '<br>';
              if (li.hasAttribute('data-font-size')) {
                p.setAttribute('data-font-size', li.getAttribute('data-font-size')!);
              }
              if (li.hasAttribute('style')) {
                p.setAttribute('style', li.getAttribute('style')!);
              }
              frag.appendChild(p);
              createdParagraphs.push(p);
            }
          } else {
            if (hasText) {
              if (!currentSubList) {
                currentSubList = document.createElement(parentList.tagName.toLowerCase());
                Array.from(parentList.attributes).forEach((attr) => {
                  currentSubList!.setAttribute(attr.name, attr.value);
                });
                frag.appendChild(currentSubList);
              }
              currentSubList.appendChild(li);
            }
          }
        });

        parentOfList.replaceChild(frag, parentList);
      });

      setActiveListType(null);

      if (createdParagraphs.length > 0) {
        const firstP = createdParagraphs[0];
        const lastP = createdParagraphs[createdParagraphs.length - 1];
        const newRange = document.createRange();
        if (createdParagraphs.length === 1 && range.collapsed) {
          newRange.selectNodeContents(firstP);
          newRange.collapse(false);
        } else {
          newRange.setStart(firstP, 0);
          newRange.setEnd(lastP, lastP.childNodes.length);
        }
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      }
    } else {
      // --- ACTION: CONVERT TO TARGET LIST ---
      const newTopChildren: HTMLElement[] = [];
      let currentTargetList: HTMLElement | null = null;
      const allCreatedLis: HTMLElement[] = [];

      const flushTargetList = () => {
        if (currentTargetList) {
          newTopChildren.push(currentTargetList);
          currentTargetList = null;
        }
      };

      const getOrCreateTargetList = (): HTMLElement => {
        if (!currentTargetList) {
          const targetTag = targetType === 'numbered' ? 'ol' : 'ul';
          currentTargetList = document.createElement(targetTag);
          currentTargetList.setAttribute('data-list-type', targetType);
        }
        return currentTargetList;
      };

      const createLiFromBlock = (b: HTMLElement): HTMLElement => {
        const li = document.createElement('li');
        li.innerHTML = b.innerHTML || '<br>';
        if (b.hasAttribute('data-font-size')) {
          li.setAttribute('data-font-size', b.getAttribute('data-font-size')!);
        }
        if (b.hasAttribute('style')) {
          li.setAttribute('style', b.getAttribute('style')!);
        }
        allCreatedLis.push(li);
        return li;
      };

      const isSingleCollapsed = range.collapsed && selectedBlocks.length <= 1;
      const editorChildren = Array.from(editorRef.current.children);

      editorChildren.forEach((childNode, childIdx) => {
        const child = childNode as HTMLElement;
        const tag = child.tagName.toLowerCase();

        if (tag === 'ul' || tag === 'ol') {
          const childLis = Array.from(child.children) as HTMLElement[];
          let unselectedSubList: HTMLElement | null = null;

          childLis.forEach((li) => {
            const hasText = (li.textContent || '').trim().length > 0;
            if (selectedBlocks.includes(li)) {
              if (!hasText && !isSingleCollapsed) {
                // Skip empty li: do not create bullet where there is no text!
                return;
              }
              if (unselectedSubList) {
                newTopChildren.push(unselectedSubList);
                unselectedSubList = null;
              }
              const tList = getOrCreateTargetList();
              tList.appendChild(createLiFromBlock(li));
            } else {
              flushTargetList();
              if (hasText) {
                if (!unselectedSubList) {
                  unselectedSubList = document.createElement(tag);
                  Array.from(child.attributes).forEach((attr) => {
                    unselectedSubList!.setAttribute(attr.name, attr.value);
                  });
                }
                unselectedSubList.appendChild(li);
              }
            }
          });

          if (unselectedSubList) {
            newTopChildren.push(unselectedSubList);
          }
        } else {
          const hasText = (child.textContent || '').trim().length > 0;
          if (selectedBlocks.includes(child)) {
            if (hasText || isSingleCollapsed) {
              const tList = getOrCreateTargetList();
              tList.appendChild(createLiFromBlock(child));
            } else {
              // Blank line in selection:
              // Check if any subsequent block in selection has text
              const remainingHasText = editorChildren
                .slice(childIdx + 1)
                .some(
                  (nextChild) =>
                    selectedBlocks.includes(nextChild as HTMLElement) &&
                    (nextChild.textContent || '').trim().length > 0
                );

              if (!currentTargetList) {
                // Blank line before any bullet list has started (e.g. under header title)
                newTopChildren.push(child);
              } else if (!remainingHasText) {
                // Blank line after all bullet list items
                flushTargetList();
                newTopChildren.push(child);
              }
              // If remainingHasText is true and currentTargetList exists, it is an empty line between rules:
              // omit it so the rules join into a single clean list without empty bullets!
            }
          } else {
            flushTargetList();
            newTopChildren.push(child);
          }
        }
      });

      flushTargetList();

      // Merge contiguous lists of the same type
      const mergedTopChildren: HTMLElement[] = [];
      newTopChildren.forEach((child) => {
        const prev = mergedTopChildren[mergedTopChildren.length - 1];
        if (
          prev &&
          (prev.tagName.toLowerCase() === 'ul' || prev.tagName.toLowerCase() === 'ol') &&
          prev.tagName.toLowerCase() === child.tagName.toLowerCase() &&
          prev.getAttribute('data-list-type') === child.getAttribute('data-list-type')
        ) {
          while (child.firstChild) {
            prev.appendChild(child.firstChild);
          }
        } else {
          mergedTopChildren.push(child);
        }
      });

      // Update editor DOM
      editorRef.current.innerHTML = '';
      mergedTopChildren.forEach((node) => editorRef.current?.appendChild(node));

      setActiveListType(targetType);

      if (allCreatedLis.length > 0) {
        const firstLi = allCreatedLis[0];
        const lastLi = allCreatedLis[allCreatedLis.length - 1];
        const newRange = document.createRange();
        if (allCreatedLis.length === 1 && range.collapsed) {
          newRange.selectNodeContents(firstLi);
          newRange.collapse(false);
        } else {
          newRange.setStart(firstLi, 0);
          newRange.setEnd(lastLi, lastLi.childNodes.length);
        }
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      }
    }

    updateEditorState();
  };

  // Enter key & keyboard shortcut interceptor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U)
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
    }

    // Prevent browser from destroying font-sized block on Backspace when erasing last character
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        // Handle empty list item — exit it as paragraph
        const li = findClosestTag(sel.anchorNode, 'LI', editorRef.current);
        if (li && (!li.textContent || !li.textContent.trim())) {
          e.preventDefault();
          const listParent = li.parentElement;
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          if (listParent) {
            listParent.parentNode?.insertBefore(p, listParent.nextSibling);
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
        }

        // Handle Backspace at start of a paragraph: remove preceding blank spacer <p><br></p>
        if (sel.isCollapsed) {
          const selRange = sel.getRangeAt(0);
          if (selRange.startOffset === 0) {
            const currentBlock = findClosestBlock(sel.anchorNode, editorRef.current);
            if (
              currentBlock &&
              currentBlock !== editorRef.current &&
              currentBlock.parentElement === editorRef.current
            ) {
              const prevSibling = currentBlock.previousElementSibling as HTMLElement | null;
              if (
                prevSibling &&
                (prevSibling.tagName.toLowerCase() === 'p') &&
                (!prevSibling.textContent || !prevSibling.textContent.trim())
              ) {
                // The previous sibling is a blank spacer line — remove it
                e.preventDefault();
                prevSibling.remove();
                // Restore cursor at start of current block
                const range = document.createRange();
                range.setStart(currentBlock, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                updateEditorState();
                return;
              }
            }
          }
        }

        const span = findClosestTag(sel.anchorNode, 'SPAN', editorRef.current);
        if (span && span.hasAttribute('data-font-size')) {
          const text = span.textContent || '';
          if (text.length <= 1) {
            e.preventDefault();
            const fontSize = span.getAttribute('data-font-size') as 'small' | 'large';
            const block = findClosestBlock(span, editorRef.current);
            if (block && block !== editorRef.current) {
              block.setAttribute('data-font-size', fontSize);
              block.setAttribute(
                'style',
                fontSize === 'small'
                  ? 'font-size: 0.75rem; line-height: 1.25rem;'
                  : 'font-size: 1.125rem; line-height: 1.6rem;'
              );
              span.remove();
              block.innerHTML = '<br>';
              const range = document.createRange();
              range.setStart(block, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              updateEditorState();
              return;
            }
          }
        }

        const block = findClosestBlock(sel.anchorNode, editorRef.current);
        if (block && block !== editorRef.current) {
          const fontSizeAttr = block.getAttribute('data-font-size');
          const text = block.textContent || '';
          if (text.length <= 1 && fontSizeAttr) {
            e.preventDefault();
            block.innerHTML = '<br>';
            const range = document.createRange();
            range.setStart(block, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            updateEditorState();
            return;
          }
        }
      }
    }

    // List navigation on Enter
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !editorRef.current) return;

      const li = findClosestTag(sel.anchorNode, 'LI', editorRef.current);
      if (li) {
        e.preventDefault();
        const listParent = li.parentElement;
        const liText = li.textContent?.trim() || '';

        // SECOND ENTER: Empty bullet exits the list!
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
              listParent.parentNode?.insertBefore(
                newSubList,
                listParent.nextSibling
              );
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
          const currentSize = li.getAttribute('data-font-size');
          if (currentSize) {
            newLi.setAttribute('data-font-size', currentSize);
            newLi.setAttribute('style', li.getAttribute('style') || '');
          }

          const afterRange = range.cloneRange();
          afterRange.setEndAfter(li.lastChild || li);
          const fragment = afterRange.extractContents();

          if (!fragment.textContent || fragment.textContent.trim() === '') {
            newLi.innerHTML = '<br>';
          } else {
            newLi.appendChild(fragment);
          }

          if (
            !li.childNodes.length ||
            (li.textContent === '' && !li.querySelector('br'))
          ) {
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

    // Prevent typing if character limit reached
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

  // Paste handling with clean sanitization and length clamping
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
      document.execCommand('insertText', false, toInsert);
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
          color: #38bdf8 !important;
          font-weight: 700 !important;
          font-size: 1.05em !important;
          user-select: none !important;
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
          color: #38bdf8 !important;
          font-weight: 700 !important;
          font-size: 1.1em !important;
          user-select: none !important;
        }
        /* Do not show bullets on blank/empty lines */
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

        /* Line spacing overrides */
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
      `}</style>

      <div className="space-y-4">
        {/* Header Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5">
          <ScrollText className="w-5 h-5 text-blue-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-blue-900 dark:text-blue-200">
              Configure Event Participation Rules
            </p>
            <p className="text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
              Define the eligibility guidelines, event schedule flow, judging criteria, code of conduct, and submission specifications for participants.
            </p>
          </div>
        </div>

        {/* Rich Text Editor Container */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-inner overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500/60 transition-all">
          {/* Professional Compact Toolbar — single row */}
          <div className="px-2.5 py-1.5 border-b border-slate-700/70 bg-slate-800/60 flex items-center gap-1">


            {/* Group 2: Bold · Italic · Underline */}
            <div className="flex items-center gap-0.5 bg-slate-900/50 border border-slate-700/50 rounded-lg p-0.5">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => handleToggleFormat('bold')}
                title="Bold (Ctrl+B)"
                aria-label="Bold (Ctrl+B)"
                aria-pressed={isBold}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isBold
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => handleToggleFormat('italic')}
                title="Italic (Ctrl+I)"
                aria-label="Italic (Ctrl+I)"
                aria-pressed={isItalic}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isItalic
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => handleToggleFormat('underline')}
                title="Underline (Ctrl+U)"
                aria-label="Underline (Ctrl+U)"
                aria-pressed={isUnderline}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isUnderline
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                }`}
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-700/50 mx-0.5 shrink-0" />

            {/* Font Size Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => {
                  setIsPlaceholderDismissed(true);
                  setIsFontDropdownOpen((prev) => !prev);
                  setIsColorPickerOpen(false);
                  setIsLineSpacingOpen(false);
                }}
                title="Font Size"
                aria-label="Font Size"
                aria-haspopup="listbox"
                aria-expanded={isFontDropdownOpen}
                className={`h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] font-semibold tracking-wide border transition-all cursor-pointer ${
                  isFontDropdownOpen
                    ? 'bg-slate-700 border-slate-600 text-slate-100'
                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:text-slate-100 hover:bg-slate-700/70 hover:border-slate-600/60'
                }`}
              >
                <span className="capitalize">{activeFontSize}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isFontDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFontDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 mt-1.5 w-36 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/70 py-1 z-30 backdrop-blur-md overflow-hidden"
                >
                  {(['small', 'normal', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={activeFontSize === size}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleApplyFontSize(size)}
                      className={`w-full px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                        activeFontSize === size
                          ? 'bg-blue-500/15 text-sky-400'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`font-medium ${size === 'small' ? 'text-[10px]' : size === 'large' ? 'text-sm' : 'text-xs'}`}>
                        {size === 'small' ? 'Small — 12px' : size === 'normal' ? 'Normal — 14px' : 'Large — 18px'}
                      </span>
                      {activeFontSize === size && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text Color Picker */}
            <div className="relative" ref={colorPickerRef}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => {
                  setIsPlaceholderDismissed(true);
                  setIsColorPickerOpen((prev) => !prev);
                  setIsFontDropdownOpen(false);
                  setIsLineSpacingOpen(false);
                }}
                title="Text Color"
                aria-label="Text Color"
                aria-haspopup="dialog"
                aria-expanded={isColorPickerOpen}
                className={`w-7 h-7 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                  isColorPickerOpen
                    ? 'bg-slate-700 border-slate-600'
                    : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-700/70 hover:border-slate-600/60'
                }`}
              >
                <Baseline className="w-3 h-3 text-slate-400" />
                {/* Color indicator bar */}
                <div
                  className="w-3.5 h-0.5 rounded-full"
                  style={{ backgroundColor: activeColor || '#94a3b8' }}
                />
              </button>

              {isColorPickerOpen && (
                <div
                  role="dialog"
                  aria-label="Text color picker"
                  className="absolute left-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/70 p-2.5 z-30 backdrop-blur-md"
                >
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Text Color</p>
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {TEXT_COLORS.filter(c => c.value).map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyColor(c.value)}
                        title={c.name}
                        aria-label={c.name}
                        className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 cursor-pointer ${
                          activeColor === c.value
                            ? 'border-white shadow-md'
                            : 'border-transparent hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleApplyColor('')}
                    className={`w-full px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                      !activeColor
                        ? 'bg-blue-500/15 text-sky-400'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-sm border border-dashed border-slate-500 bg-transparent" />
                    Default
                    {!activeColor && <Check className="w-3 h-3 text-sky-400 ml-auto" />}
                  </button>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-700/50 mx-0.5 shrink-0" />

            {/* Line Spacing Dropdown */}
            <div className="relative" ref={lineSpacingRef}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => {
                  setIsLineSpacingOpen((prev) => !prev);
                  setIsFontDropdownOpen(false);
                  setIsColorPickerOpen(false);
                }}
                title="Line Spacing"
                aria-label="Line Spacing"
                aria-haspopup="listbox"
                aria-expanded={isLineSpacingOpen}
                className={`h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] font-semibold border transition-all cursor-pointer ${
                  isLineSpacingOpen
                    ? 'bg-slate-700 border-slate-600 text-slate-100'
                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:text-slate-100 hover:bg-slate-700/70 hover:border-slate-600/60'
                }`}
              >
                <AlignJustify className="w-3 h-3" />
                <span>{activeLineSpacing}×</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isLineSpacingOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLineSpacingOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 mt-1.5 w-32 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/70 py-1 z-30 backdrop-blur-md overflow-hidden"
                >
                  {(['1', '1.5', '2', '2.5'] as const).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      role="option"
                      aria-selected={activeLineSpacing === sp}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleApplyLineSpacing(sp)}
                      className={`w-full px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        activeLineSpacing === sp
                          ? 'bg-blue-500/15 text-sky-400'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{sp === '1' ? 'Single (1×)' : sp === '1.5' ? 'Default (1.5×)' : sp === '2' ? 'Double (2×)' : 'Wide (2.5×)'}</span>
                      {activeLineSpacing === sp && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-700/50 mx-0.5 shrink-0" />

            {/* Group 3: List Buttons — Bullet · Numbered · Checklist · Arrow */}
            <div className="flex items-center gap-0.5 bg-slate-900/50 border border-slate-700/50 rounded-lg p-0.5">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => handleToggleList('bullet')}
                title="Bullet List (•)"
                aria-label="Bullet List"
                aria-pressed={activeListType === 'bullet'}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  activeListType === 'bullet'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => handleToggleList('numbered')}
                title="Numbered List (1.)"
                aria-label="Numbered List"
                aria-pressed={activeListType === 'numbered'}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  activeListType === 'numbered'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => handleToggleList('checklist')}
                title="Checklist (☑)"
                aria-label="Checklist"
                aria-pressed={activeListType === 'checklist'}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  activeListType === 'checklist'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); saveCurrentRange(); }}
                onClick={() => handleToggleList('arrow')}
                title="Arrow List (→)"
                aria-label="Arrow List"
                aria-pressed={activeListType === 'arrow'}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  activeListType === 'arrow'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/70'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Editable Content Area */}
          <div
            className="relative min-h-[220px] max-h-[340px] overflow-y-auto p-4 cursor-text"
            onClick={() => editorRef.current?.focus()}
          >
            {/* Placeholder / Example Guidelines */}
            {!isPlaceholderDismissed && isEmpty && (
              <div
                className="absolute top-4 left-4 right-4 pointer-events-none select-none text-xs sm:text-sm leading-relaxed font-sans opacity-70"
              >
                <div className="text-slate-400 font-semibold mb-2">Example guidelines:</div>
                <div className="space-y-1 text-slate-500">
                  <div>• Eligibility: Open to all 1st–4th year undergraduate students.</div>
                  <div>• Team Size: 1 to 4 members per team.</div>
                  <div>• Code of Conduct: Any form of plagiarism will lead to immediate disqualification.</div>
                  <div>• Submission: Projects must be submitted before the deadline on GitHub.</div>
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
              className="rules-rich-editor min-h-[200px] outline-none text-xs sm:text-sm leading-relaxed text-slate-100 font-sans"
            />
          </div>

          {/* Footer Status Bar */}
          <div className="px-3.5 py-2 border-t border-slate-800/80 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 shrink-0"></span>
              <span className="hidden sm:inline">Press Enter twice to exit list</span>
            </div>

            <span
              className={`text-xs font-semibold shrink-0 ${
                remainingChars < 200
                  ? remainingChars <= 0
                    ? 'text-red-500 font-bold'
                    : 'text-amber-500 font-bold'
                  : 'text-slate-400'
              }`}
            >
              {charCount.toLocaleString()} / {MAX_RULES_LENGTH.toLocaleString()} characters
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5 text-white" />
            <span>Save Rules</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
