import DOMPurify from 'isomorphic-dompurify';
import { Marked, type Tokens } from 'marked';
import { createHighlighter } from 'shiki';

const theme = 'rose-pine-dawn';
const langs = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'bash',
  'sh',
  'html',
  'css',
  'md',
  'python',
  'rust',
  'go',
  'sql',
] as const;

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

let highlighterPromise: Promise<Highlighter> | undefined;

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\uAC00-\uD7AF\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');

  return slug || 'section';
}

export async function renderMarkdown(md: string): Promise<string> {
  const highlighter = await getHighlighter();
  const slugs = createSlugger();
  const supportedLangs = new Set<string>(langs);

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      code({ text, lang }: Tokens.Code) {
        const rawLang = normalizeLang(lang);
        const shikiLang = rawLang && supportedLangs.has(rawLang) ? rawLang : 'text';
        const html = highlighter.codeToHtml(text, { lang: shikiLang, theme });

        if (!rawLang) {
          return html;
        }

        return `<figure class="code-block"><figcaption>${escapeHtml(rawLang)}</figcaption>${html}</figure>`;
      },
      heading({ tokens, text, depth }: Tokens.Heading) {
        const innerHtml = this.parser.parseInline(tokens);
        const id = slugs(text);

        return `<h${depth} id="${id}">${innerHtml}</h${depth}>`;
      },
    },
  });

  const html = await marked.parse(md);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a',
      'blockquote',
      'br',
      'code',
      'del',
      'div',
      'em',
      'figcaption',
      'figure',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'img',
      'li',
      'ol',
      'p',
      'pre',
      'span',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'ul',
    ],
    ALLOWED_ATTR: [
      'alt',
      'class',
      'href',
      'id',
      'rel',
      'src',
      'style',
      'target',
      'title',
    ],
  });
}

export function extractToc(md: string): { id: string; text: string; depth: 2 | 3 }[] {
  const items: { id: string; text: string; depth: 2 | 3 }[] = [];
  const slugs = createSlugger();
  let inFence = false;

  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const match = /^(##|###)\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) {
      continue;
    }

    const text = stripHeadingMarkup(match[2]);
    items.push({
      id: slugs(text),
      text,
      depth: match[1].length as 2 | 3,
    });
  }

  return items;
}

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [theme],
    langs: [...langs],
  });

  return highlighterPromise;
}

function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();

  return (text: string) => {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    return count === 0 ? base : `${base}-${count}`;
  };
}

function normalizeLang(lang: string | undefined): string {
  return (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
}

function stripHeadingMarkup(text: string): string {
  return text
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
