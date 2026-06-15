import sanitize from 'sanitize-html';

/**
 * Server-side HTML sanitization using sanitize-html with a strict allowlist.
 *
 * TipTap produces a bounded set of HTML tags. We explicitly allow only those
 * tags and attributes, stripping everything else before persisting to the DB.
 *
 * The frontend post-detail.tsx also runs a DOM-based sanitizer as defense-in-depth.
 *
 * After replacing this file run:
 *   npm install sanitize-html
 *   npm install --save-dev @types/sanitize-html
 */
export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [
      // Block
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'blockquote', 'pre', 'hr', 'br',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'figure', 'figcaption',
      'div', 'span',
      // Inline
      'a', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'code',
      'mark', 'sub', 'sup',
      // Media
      'img',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      pre: ['class'],
      code: ['class'],
      span: ['class', 'style'],
      div: ['class'],
      p: ['class'],
      '*': ['data-type'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: {
      img: ['https', 'http', 'data'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          ...(attribs.target === '_blank' ? { target: '_blank' } : {}),
        },
      }),
    },
    allowedStyles: {
      span: {
        color: [/^#[0-9a-f]{3,6}$/i, /^rgb\(\d+,\s*\d+,\s*\d+\)$/],
        'background-color': [/^#[0-9a-f]{3,6}$/i],
      },
    },
  });
}
