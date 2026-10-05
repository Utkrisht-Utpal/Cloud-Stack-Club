// Utility to safely sanitize, format, and render rich event descriptions
// Supports WhatsApp/Rich text formatting (Bold, Italic, Strikethrough, Code, Lists, Blockquotes)

export const isHtmlDescription = (content: string | null | undefined): boolean => {
  if (!content) return false;
  return /<([a-z]+)[^>]*>/i.test(content);
};

export const stripHtml = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/<br\s*[\/]?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/li>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Parses basic WhatsApp-style markup (*bold*, _italic_, ~strike~, `code`) in plain text
 */
export const parseWhatsAppMarkup = (text: string): string => {
  if (!text) return '';
  return text
    // Monospace `code`
    .replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-xs border border-slate-300 dark:border-slate-700">$1</code>')
    // Bold *text*
    .replace(/\*([^*\n]+)\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    // Italic _text_
    .replace(/_([^_\n]+)_/g, '<em class="italic">$1</em>')
    // Strikethrough ~text~
    .replace(/~([^~\n]+)~/g, '<del class="line-through opacity-80">$1</del>');
};

/**
 * Sanitizes rich HTML for event descriptions, ensuring safety while rendering
 * beautiful typography for bold, italic, strikethrough, code, lists, and blockquotes.
 */
export const sanitizeDescriptionHtml = (rawHtml: string): string => {
  if (!rawHtml) return '';
  if (typeof window === 'undefined') return rawHtml;

  // If plain text (no HTML tags), handle newlines and optional WhatsApp markup
  if (!isHtmlDescription(rawHtml)) {
    const escaped = rawHtml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const formatted = parseWhatsAppMarkup(escaped);
    return formatted.replace(/\n/g, '<br />');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Strip dangerous elements
  const dangerous = doc.querySelectorAll('script, style, iframe, object, embed, svg, img, video, audio, form, input, button, select, textarea');
  dangerous.forEach((el) => el.remove());

  const allowedTags = new Set([
    'p', 'br', 'b', 'strong', 'i', 'em', 's', 'del', 'strike', 'u',
    'code', 'pre', 'ol', 'ul', 'li', 'blockquote', 'span', 'div'
  ]);

  const sanitizeNode = (node: HTMLElement) => {
    const tag = node.tagName.toLowerCase();

    // Convert div to p or clean container
    if (tag === 'div') {
      const p = doc.createElement('p');
      while (node.firstChild) p.appendChild(node.firstChild);
      node.parentNode?.replaceChild(p, node);
      sanitizeNode(p);
      return;
    }

    // Convert <font color="..." size="..."> to <span style="...">
    if (tag === 'font') {
      const colorAttr = node.getAttribute('color');
      const sizeAttr = node.getAttribute('size');
      const span = doc.createElement('span');
      const styles: string[] = [];
      if (colorAttr) {
        const lowerColor = colorAttr.trim().toLowerCase();
        // If neutral color that causes theme inversion clash, adapt to theme
        if (
          lowerColor === '#ffffff' ||
          lowerColor === '#fff' ||
          lowerColor === '#94a3b8' ||
          lowerColor === '#cbd5e1' ||
          lowerColor === '#e2e8f0' ||
          lowerColor === '#f8fafc' ||
          lowerColor === '#000000' ||
          lowerColor === '#000' ||
          lowerColor === '#0f172a' ||
          lowerColor === 'inherit'
        ) {
          span.classList.add('theme-adaptive-text');
        } else {
          styles.push(`color: ${colorAttr}`);
        }
      }
      if (sizeAttr) {
        const sizeMap: Record<string, string> = {
          '1': '10px',
          '2': '12px',
          '3': '14px',
          '4': '16px',
          '5': '18px',
          '6': '20px',
          '7': '24px',
        };
        styles.push(`font-size: ${sizeMap[sizeAttr] || `${sizeAttr}px`}`);
      }
      if (styles.length) {
        span.setAttribute('style', styles.join('; '));
      }
      while (node.firstChild) span.appendChild(node.firstChild);
      node.parentNode?.replaceChild(span, node);
      sanitizeNode(span);
      return;
    }

    // Adapt existing span with hardcoded neutral colors to theme-adaptive text
    if (tag === 'span') {
      const style = node.getAttribute('style') || '';
      if (
        /color:\s*(#ffffff|#fff|#94a3b8|#cbd5e1|#e2e8f0|#f8fafc|#000000|#000|#0f172a|rgb\(255,\s*255,\s*255\)|rgb\(148,\s*163,\s*184\)|rgb\(0,\s*0,\s*0\))/i.test(
          style
        )
      ) {
        node.style.color = '';
        node.classList.add('theme-adaptive-text');
        if (!node.getAttribute('style')?.trim()) {
          node.removeAttribute('style');
        }
      }
    }

    if (!allowedTags.has(tag)) {
      const parent = node.parentNode;
      if (parent) {
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
      }
      return;
    }

    // Strip event attributes & dangerous styles
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name.startsWith('javascript:')) {
        node.removeAttribute(name);
      }
    });

    Array.from(node.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        sanitizeNode(child);
      }
    });
  };

  Array.from(doc.body.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      sanitizeNode(child);
    }
  });

  return doc.body.innerHTML;
};
