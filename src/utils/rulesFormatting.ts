// Shared sanitization and conversion utilities for event rules

export const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const isHtmlRules = (content: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(content || '');
};

export const hasRulesTextContent = (content: string): boolean => {
  if (!content) return false;
  const stripped = content.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s+/g, '');
  return stripped.length > 0;
};

// Sanitize HTML strictly allowing only safe formatting and list tags/attributes
export const sanitizeRulesHtml = (html: string): string => {
  if (!html) return '';
  if (typeof window === 'undefined') return html;

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
      ['data-font-size', 'data-line-spacing', 'data-align', 'data-indent', 'style'].forEach((attr) => {
        if (el.hasAttribute(attr)) {
          p.setAttribute(attr, el.getAttribute(attr)!);
        }
      });
      while (el.firstChild) p.appendChild(el.firstChild);
      el.parentNode?.replaceChild(p, el);
      sanitizeElement(p);
      return;
    }

    // Convert headings h1-h6 to p with bold and large size
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

    // Convert <font color="X"> to <span style="color: X">
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
        } else if (name === 'data-line-spacing') {
          const valid = ['1', '1.5', '2', '2.5'].includes(attr.value);
          if (!valid) el.removeAttribute(attr.name);
        } else if (name === 'data-align') {
          const valid = ['left', 'center', 'right'].includes(attr.value.toLowerCase());
          if (!valid) el.removeAttribute(attr.name);
        } else if (name === 'data-indent') {
          const valid = ['1', '2', '3', '4', '5', '6'].includes(attr.value);
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
        } else if (name === 'data-align') {
          const valid = ['left', 'center', 'right'].includes(attr.value.toLowerCase());
          if (!valid) el.removeAttribute(attr.name);
        } else if (name === 'data-indent') {
          const valid = ['1', '2', '3', '4', '5', '6'].includes(attr.value);
          if (!valid) el.removeAttribute(attr.name);
        } else if (name === 'style') {
          // Reconstruct only safe style properties: font-size, line-height, text-align, margin-left, padding-left, color
          let cleanStyle = '';
          const rawStyle = attr.value;

          // Preserve font-size
          if (rawStyle.toLowerCase().includes('0.75rem') || rawStyle.toLowerCase().includes('12px')) {
            cleanStyle += 'font-size: 0.75rem; line-height: 1.25rem; ';
          } else if (rawStyle.toLowerCase().includes('1.125rem') || rawStyle.toLowerCase().includes('18px')) {
            cleanStyle += 'font-size: 1.125rem; line-height: 1.6rem; ';
          }

          // Preserve text-align
          const alignMatch = rawStyle.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right)/i);
          if (alignMatch) {
            cleanStyle += `text-align: ${alignMatch[1].toLowerCase()}; `;
          }

          // Preserve margin-left
          const marginMatch = rawStyle.match(/(?:^|;)\s*margin-left\s*:\s*(\d+(?:\.\d+)?(?:rem|px))/i);
          if (marginMatch) {
            cleanStyle += `margin-left: ${marginMatch[1]}; `;
          }

          // Preserve padding-left
          const paddingMatch = rawStyle.match(/(?:^|;)\s*padding-left\s*:\s*(\d+(?:\.\d+)?(?:rem|px))/i);
          if (paddingMatch) {
            cleanStyle += `padding-left: ${paddingMatch[1]}; `;
          }

          // Preserve line-height
          const lhMatch = rawStyle.match(/(?:^|;)\s*line-height\s*:\s*(1|1\.5|2|2\.5)/i);
          if (lhMatch) {
            cleanStyle += `line-height: ${lhMatch[1]}; `;
          }

          // Preserve color (safe CSS values only: hex, rgb, rgba, named)
          const colorMatch = rawStyle.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
          if (colorMatch) {
            const colorVal = colorMatch[1].trim();
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

    // Ensure list elements have valid data-list-type attribute
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

  // Remove empty list items that have no text and no br
  doc.querySelectorAll('li').forEach((li) => {
    if (!li.textContent?.trim() && !li.querySelector('br')) {
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
export const cleanPastedHtml = (html: string): string => {
  if (!html) return '';
  if (typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Strip scripts, styles, meta, comments, xml tags
  doc.querySelectorAll('script, style, meta, link, xml, o\\:p').forEach((el) => el.remove());

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
    el.removeAttribute('color');
    el.removeAttribute('face');
    el.removeAttribute('size');
  };

  Array.from(doc.body.children).forEach((child) => walk(child as HTMLElement));
  return sanitizeRulesHtml(doc.body.innerHTML);
};

// Convert legacy plain text (with bullets/numbers) into structured HTML
export const convertPlainTextToHtml = (plain: string): string => {
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
