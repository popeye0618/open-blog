const HANGUL_RE = /[\uAC00-\uD7AF]/;
const HANGUL_RUN_RE = /[\uAC00-\uD7AF]+/g;

export function containsHangul(s: string): boolean {
  return HANGUL_RE.test(s);
}

export function buildSearchTokens(...inputs: string[]): string {
  const normalized = stripMarkdown(inputs.join(' ').toLowerCase());
  const tokens = new Set<string>();

  for (const rawWord of normalized.split(/\s+/)) {
    const word = trimToken(rawWord);

    if (!word) {
      continue;
    }

    if (containsHangul(word)) {
      for (const run of word.match(HANGUL_RUN_RE) ?? []) {
        addHangulNgrams(tokens, run);
      }
      continue;
    }

    if (word.length >= 2) {
      tokens.add(word);
    }
  }

  return Array.from(tokens).join(' ');
}

function stripMarkdown(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/<[^>]+>/g, ' ');
}

function trimToken(input: string): string {
  return input.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function addHangulNgrams(tokens: Set<string>, run: string): void {
  for (const size of [2, 3]) {
    if (run.length < size) {
      continue;
    }

    for (let index = 0; index <= run.length - size; index += 1) {
      tokens.add(run.slice(index, index + size));
    }
  }
}

// TODO test with vitest once the project has a test runner.
