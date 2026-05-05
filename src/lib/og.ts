import { Resvg, initWasm } from '@resvg/resvg-wasm';
import satori from 'satori';
import wasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url';
import fontUrl from '@/assets/fonts/Pretendard-Bold.subset.woff?url';

const WIDTH = 1200;
const HEIGHT = 630;
const PUBLIC_FONT_PATH = '/fonts/Pretendard-Bold.subset.woff';
const REMOTE_FONT_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/packages/pretendard/dist/web/static/woff/Pretendard-Bold.woff';

let wasmReady: Promise<void> | undefined;
let fontDataReady: Promise<ArrayBuffer> | undefined;

type RenderOgImageOptions = {
  title: string;
  siteTitle: string;
  lang: 'ko' | 'en';
  date?: string;
  assetBaseUrl?: string;
};

export async function renderOgImage(opts: RenderOgImageOptions): Promise<Uint8Array> {
  await ensureWasm(opts.assetBaseUrl);

  try {
    const fontData = await loadFontData(opts.assetBaseUrl);
    const svg = await satori(buildTree(opts), {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: 'Pretendard',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    });

    return renderPng(svg);
  } catch (error) {
    console.warn('OG font or satori render failed; falling back to simple SVG.', error);
    return renderPng(buildFallbackSvg(opts));
  }
}

function buildTree({ title, siteTitle, lang, date }: RenderOgImageOptions) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        padding: '72px 84px',
        background: 'linear-gradient(135deg, #FFF8F0 0%, #FFD6BA 100%)',
        color: '#2B2A33',
        fontFamily: 'Pretendard',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              right: '-110px',
              top: '-100px',
              width: '360px',
              height: '360px',
              borderRadius: '44% 56% 52% 48%',
              background: '#C7B8EA',
              opacity: 0.42,
              transform: 'rotate(12deg)',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: '-80px',
              bottom: '-120px',
              width: '310px',
              height: '310px',
              borderRadius: '58% 42% 44% 56%',
              background: '#B5EAD7',
              opacity: 0.5,
              transform: 'rotate(-14deg)',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '44px',
              position: 'relative',
              zIndex: 1,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: 28,
                    letterSpacing: 0,
                    color: 'rgba(43,42,51,0.72)',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          width: 54,
                          height: 10,
                          borderRadius: 999,
                          background: '#FFB5C5',
                        },
                      },
                    },
                    siteTitle,
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    maxWidth: 900,
                    fontSize: 68,
                    lineHeight: 1.15,
                    letterSpacing: 0,
                    fontWeight: 700,
                    wordBreak: 'keep-all',
                  },
                  children: title,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              position: 'relative',
              zIndex: 1,
              fontSize: 28,
              color: 'rgba(43,42,51,0.72)',
            },
            children: [
              date ?? '',
              {
                type: 'div',
                props: {
                  style: {
                    padding: '8px 18px',
                    borderRadius: 999,
                    background: 'rgba(255,238,173,0.92)',
                    color: '#2B2A33',
                  },
                  children: lang,
                },
              },
            ],
          },
        },
      ],
    },
  } as any;
}

function renderPng(svg: string): Uint8Array {
  return new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: WIDTH,
    },
    background: '#FFF8F0',
  })
    .render()
    .asPng();
}

async function ensureWasm(assetBaseUrl?: string): Promise<void> {
  if (!wasmReady) {
    wasmReady = initWasm(fetch(toAssetUrl(wasmUrl, assetBaseUrl))).catch((error) => {
      if (error instanceof Error && error.message.includes('Already initialized')) {
        return;
      }

      wasmReady = undefined;
      throw error;
    });
  }

  await wasmReady;
}

async function loadFontData(assetBaseUrl?: string): Promise<ArrayBuffer> {
  if (!fontDataReady) {
    fontDataReady = fetchFirstOk([
      toAssetUrl(fontUrl, assetBaseUrl),
      toAssetUrl(PUBLIC_FONT_PATH, assetBaseUrl),
      REMOTE_FONT_URL,
    ]).catch((error) => {
      fontDataReady = undefined;
      throw error;
    });
  }

  return fontDataReady;
}

async function fetchFirstOk(urls: string[]): Promise<ArrayBuffer> {
  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response.arrayBuffer();
      }

      lastError = new Error(`Font fetch failed: ${response.status} ${url}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function toAssetUrl(pathOrUrl: string, assetBaseUrl?: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (assetBaseUrl) {
    return new URL(pathOrUrl, assetBaseUrl).toString();
  }

  return new URL(pathOrUrl, import.meta.url).toString();
}

function buildFallbackSvg({ title, siteTitle, lang, date }: RenderOgImageOptions): string {
  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#FFF8F0"/>
      <stop offset="100%" stop-color="#FFD6BA"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <path d="M1045 -70 C1160 -34 1248 64 1240 180 C1232 296 1110 355 1003 314 C908 278 870 149 920 54 C948 1 989 -88 1045 -70Z" fill="#C7B8EA" opacity="0.42"/>
  <path d="M-50 486 C52 400 195 424 238 538 C278 646 173 728 53 692 C-35 666 -119 548 -50 486Z" fill="#B5EAD7" opacity="0.5"/>
  <rect x="84" y="86" width="54" height="10" rx="5" fill="#FFB5C5"/>
  <text x="154" y="105" font-family="sans-serif" font-size="28" font-weight="700" fill="rgba(43,42,51,0.72)">${escapeSvg(siteTitle)}</text>
  <foreignObject x="84" y="178" width="900" height="310">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;font-size:64px;font-weight:700;line-height:1.15;color:#2B2A33;word-break:keep-all;">${escapeSvg(title)}</div>
  </foreignObject>
  <text x="84" y="536" font-family="sans-serif" font-size="28" font-weight="700" fill="rgba(43,42,51,0.72)">${escapeSvg(date ?? '')}</text>
  <rect x="230" y="500" width="82" height="44" rx="22" fill="#FFEEAD" opacity="0.92"/>
  <text x="257" y="530" font-family="sans-serif" font-size="26" font-weight="700" fill="#2B2A33">${escapeSvg(lang)}</text>
</svg>`;
}

function escapeSvg(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return char;
    }
  });
}
