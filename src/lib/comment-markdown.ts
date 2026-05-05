import DOMPurify from 'isomorphic-dompurify';
import { Marked } from 'marked';

const marked = new Marked({
  gfm: true,
  breaks: true,
});

export async function renderCommentMarkdown(md: string): Promise<string> {
  const html = await marked.parse(md);
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'blockquote', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href'],
  });

  return addSafeAnchorAttrs(sanitized);
}

export function sanitizeCommentMarkdownSource(md: string): string {
  return md
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

function addSafeAnchorAttrs(html: string): string {
  return html.replace(/<a\b([^>]*)>/g, (_match, attrs: string) => {
    let nextAttrs = attrs;

    if (!/\brel=/.test(nextAttrs)) {
      nextAttrs += ' rel="nofollow noopener"';
    }

    if (!/\btarget=/.test(nextAttrs)) {
      nextAttrs += ' target="_blank"';
    }

    return `<a${nextAttrs}>`;
  });
}
