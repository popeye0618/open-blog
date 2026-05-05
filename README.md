# popeye0618 blog (custom Astro + Cloudflare blog template)

> 파스텔 일러스트 톤의 개인 테크 블로그. Astro SSR + Cloudflare D1 + Drizzle + Turnstile + (옵션) Cloudflare Access. 호스팅 비용 0원.

[데모 스크린샷 자리 - 비워둠]

## ✨ 특징

- Astro SSR 기반의 빠른 공개 블로그
- Cloudflare Pages + D1로 무료에 가까운 운영 비용
- Drizzle ORM 마이그레이션과 타입 안전한 DB 접근
- 한글 ngram 토큰을 활용한 FTS5 검색
- 한/영 글 작성과 글별 `<html lang>` 전환
- Turnstile 검증을 포함한 익명 댓글
- sessionStorage 6시간 중복 방지 조회수 카운터
- RSS, sitemap, 동적 OG 이미지, MIT 라이선스
- 글/댓글/설정/조회수 관리를 위한 풀 어드민

## 🧱 스택

| 영역 | 기술 |
| --- | --- |
| Framework | Astro 4 SSR |
| Deploy | @astrojs/cloudflare, Cloudflare Pages |
| Styling | Tailwind CSS, @tailwindcss/typography |
| Database | Cloudflare D1 |
| ORM | Drizzle ORM, Drizzle Kit |
| Spam protection | Cloudflare Turnstile |
| Admin auth | Cloudflare Access 또는 password + jose JWT |
| Markdown | marked + shiki + DOMPurify |
| OG image | satori + @resvg/resvg-wasm |

## 🚀 빠른 시작 (Fork → 5분 안에 내 도메인에서 동작)

### 0. 사전 준비

- Cloudflare 계정 (무료)
- GitHub 계정
- Node.js 20+
- pnpm (또는 `npm exec pnpm --`)
- wrangler CLI: `npm i -g wrangler` 후 `wrangler login`

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/blog.git
cd blog
pnpm install
```

### 2. 환경변수 설정 (로컬)

`.env.example`를 `.dev.vars`로 복사하고 값을 채운다.

```bash
cp .env.example .dev.vars
```

각 키 의미는 `.env.example` 주석을 참고한다.

`AUTH_MODE`:

- `cf_access` (권장, 무료, OTP 이메일로 본인만 로그인): Cloudflare Access 설정 필요. 5번 단계 참고.
- `password`: 로컬 개발이나 Access를 쓰지 않는 셀프호스트 환경. `ADMIN_PASSWORD_HASH`와 `JWT_SECRET` 필수.

`password` 모드일 때 비밀번호 해시 생성:

```bash
node --import tsx scripts/hash-password.ts "내비번"
# 출력된 pbkdf2$... 라인을 ADMIN_PASSWORD_HASH 값으로 사용
```

로컬 Turnstile 테스트 키:

```env
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
```

### 3. D1 데이터베이스 생성 + 마이그레이션 + 시드

로컬:

```bash
wrangler d1 migrations apply blog --local
pnpm seed   # OWNER_NAME 등으로 settings 시드 + 샘플 글 2개
```

원격 (배포 직전 1회):

```bash
wrangler d1 create blog
# 출력된 database_id를 wrangler.toml의 [[d1_databases]] 블록에 채워넣는다.
wrangler d1 migrations apply blog --remote
# 시드는 원격에서는 생략 가능 - 어드민에서 직접 글 작성하면 됨.
# 강제로 원격 시드를 원하면:
# node --import tsx scripts/seed.ts
# wrangler d1 execute blog --remote --file=drizzle/seed.sql
```

### 4. 로컬 개발

```bash
pnpm dev
# http://localhost:4321
```

어드민:

- `password` 모드: `/admin/login`에서 비밀번호 입력
- `cf_access` 모드: 로컬에서는 Access 헤더가 없으므로 `password` 모드 개발 권장. 배포 환경에서만 `cf_access` 사용.

### 5. Cloudflare Pages 배포

1. GitHub에 push.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git → 본인 레포 선택.
3. 빌드 설정:
   - Framework preset: `Astro`
   - Build command: `pnpm build` (또는 `npm exec --yes pnpm -- build`)
   - Build output: `dist`
4. 환경변수 (Production) 추가: Pages 대시보드 Settings → Environment variables에 `.env.example` 키 전부 입력.
   - `PUBLIC_SITE_URL`: 배포된 URL (`https://<project>.pages.dev` 또는 커스텀 도메인)
   - `OWNER_EMAIL`, `OWNER_NAME`, `IP_HASH_SALT`, `JWT_SECRET`, `AUTH_MODE`
   - `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`
   - `password` 모드이면 `ADMIN_PASSWORD_HASH`
5. D1 바인딩: Pages 프로젝트 Settings → Functions → D1 database bindings → `DB`를 위에서 만든 `blog` DB에 연결.
6. Save → Deploy.

### 6. (옵션) Cloudflare Access 정책 - `AUTH_MODE=cf_access`일 때

1. Cloudflare Zero Trust → Access → Applications → Add → Self-hosted.
2. Application domain: `<project>.pages.dev` 또는 커스텀 도메인.
3. Path를 `/admin*`로 추가하고, 같은 앱 또는 별도 앱에 `/api/admin*`도 추가.
4. Identity provider: One-time PIN (기본 제공 이메일 OTP).
5. Policy:
   - Action: Allow
   - Include: `Emails` → `OWNER_EMAIL`과 같은 이메일
6. Save. 이제 `/admin/*`과 `/api/admin/*`은 OTP 인증을 거친 본인만 접근한다.

### 7. Turnstile

1. Cloudflare 대시보드 → Turnstile → Add site.
2. Domain: 배포 도메인.
3. Widget mode: Managed.
4. 발급받은 Site key / Secret key를 Pages 환경변수 `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`에 입력.

### 8. 첫 글 작성

`/admin/posts/new`에서 작성 → 발행. `/`에서 노출을 확인한다.

## 🔑 환경변수 레퍼런스

| 키 | 의미 | 예시 |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | RSS/sitemap/OG에서 쓰는 공개 URL. 끝에 슬래시 없이 입력 | `https://example.pages.dev` |
| `OWNER_EMAIL` | 어드민 소유자 이메일. Cloudflare Access 헤더와 비교 | `you@example.com` |
| `OWNER_NAME` | settings 시드와 푸터/About 기본값에 쓰는 이름 | `Your Name` |
| `AUTH_MODE` | `cf_access` 또는 `password` | `cf_access` |
| `ADMIN_PASSWORD_HASH` | `password` 모드에서만 사용. `scripts/hash-password.ts`로 생성 | `pbkdf2$100000$...` |
| `JWT_SECRET` | `password` 모드 JWT 쿠키 서명용. 32바이트 이상 랜덤 | `openssl rand -hex 32` |
| `PUBLIC_TURNSTILE_SITE_KEY` | 댓글 폼 Turnstile 공개 site key | `1x00000000000000000000AA` |
| `TURNSTILE_SECRET` | Turnstile server-side verify secret | `1x0000000000000000000000000000000AA` |
| `IP_HASH_SALT` | 댓글 IP hash용 salt. 한 번 정하면 바꾸지 말 것 | `openssl rand -hex 32` |

## 🗂️ 폴더 구조

```text
.
├─ drizzle/                 # D1 migrations, generated seed.sql
├─ public/                  # static assets
├─ scripts/                 # seed, password hash helpers
├─ src/
│  ├─ components/           # public and admin Astro components
│  ├─ db/                   # Drizzle schema/client
│  ├─ layouts/              # Root layout
│  ├─ lib/                  # markdown/search/auth/comments/views helpers
│  └─ pages/                # public, admin, API, RSS/sitemap/OG routes
├─ .env.example
├─ wrangler.toml
└─ package.json
```

## 🛠️ 주요 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | Astro 개발 서버 실행 |
| `pnpm build` | Cloudflare Pages용 SSR 빌드 |
| `pnpm preview` | Astro preview 실행 |
| `pnpm seed` | `drizzle/seed.sql` 생성 후 로컬 D1에 적용 |
| `pnpm db:generate` | Drizzle migration 생성 |
| `pnpm db:migrate:local` | 로컬 D1 migration 적용 |
| `pnpm db:migrate:remote` | 원격 D1 migration 적용 |
| `pnpm hash-password "비밀번호"` | `ADMIN_PASSWORD_HASH` 생성 |

## 🧪 검증 체크리스트 (선택)

- [ ] `/`에 샘플 글 노출
- [ ] `/posts/<slug>`에서 마크다운/조회수/댓글 동작
- [ ] `/search?q=<한글>` 검색 결과 나옴
- [ ] `/rss.xml`, `/sitemap.xml` 200
- [ ] `/og/<slug>.png` 이미지 생성됨
- [ ] `/admin`에 OTP/비밀번호로 로그인
- [ ] 어드민에서 글 작성/예약/삭제, 댓글 모더레이션, 설정 변경, 조회수 보정

## 🪪 라이선스

MIT

## 🇬🇧 English (short)

A pastel-toned personal tech blog template. Astro SSR + Cloudflare D1 + Drizzle + Turnstile + optional Cloudflare Access. Free hosting.

Quick start:

1. Fork & clone, `pnpm install`.
2. `cp .env.example .dev.vars`, fill in.
3. `wrangler d1 migrations apply blog --local && pnpm seed && pnpm dev`.
4. Push to GitHub, connect to Cloudflare Pages, set env vars + D1 binding, deploy.
5. Optional: set up Cloudflare Access for `/admin*` and `/api/admin*` if `AUTH_MODE=cf_access`.

See the Korean section above for full details.
