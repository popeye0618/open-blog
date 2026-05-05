# popeye0618 blog (custom Astro + Cloudflare blog template)

> 파스텔 일러스트 톤의 개인 테크 블로그. Astro SSR + Cloudflare D1 + R2 + Drizzle + Turnstile + (옵션) Cloudflare Access. 호스팅 비용 0원.

[데모 스크린샷 자리 - 비워둠]

## ✨ 특징

- Astro SSR 기반의 빠른 공개 블로그
- Cloudflare Pages + D1로 무료에 가까운 운영 비용
- Drizzle ORM 마이그레이션과 타입 안전한 DB 접근
- 한글 ngram 토큰을 활용한 FTS5 검색
- 한/영 글 작성과 글별 `<html lang>` 전환
- Turnstile 검증을 포함한 익명 댓글
- sessionStorage 6시간 중복 방지 조회수 카운터
- 어드민 본문/커버 이미지 업로드 (Cloudflare R2)
- 마크다운 툴바 + 라이브 프리뷰 어드민 에디터
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
| Image storage | Cloudflare R2 (어드민 업로드) |
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

- `cf_access` (권장, 무료, OTP 이메일로 본인만 로그인): Cloudflare Access 설정 필요. 10번 단계 참고.
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

### 3. 로컬 D1 마이그레이션 + 시드

원격(Cloudflare) D1 생성과 마이그레이션은 5단계 이후에서 다룬다. 일단 로컬에서만:

```bash
wrangler d1 migrations apply blog --local
pnpm seed   # OWNER_NAME 등으로 settings 시드 + 샘플 글 2개
```

### 4. 로컬 개발

```bash
pnpm dev
# http://localhost:4321
```

어드민:

- `password` 모드: `/admin/login`에서 비밀번호 입력
- `cf_access` 모드: 로컬에서는 Access 헤더가 없으므로 `password` 모드 개발 권장. 배포 환경에서만 `cf_access` 사용.

### 5. GitHub push & Cloudflare Pages 프로젝트 생성

1. GitHub에 push.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git → 본인 레포 선택.
3. 빌드 설정:
   - Framework preset: `Astro`
   - Build command: `pnpm build` (또는 `npm exec --yes pnpm -- build`)
   - Build output: `dist`
4. **첫 배포는 실패해도 정상이다.** 아직 D1/R2 바인딩이 없고 환경변수도 비어 있기 때문. 6~10단계를 마친 뒤 "Retry deployment" 또는 다음 push로 다시 빌드한다.

### 6. 원격 D1 생성 + 마이그레이션

```bash
wrangler d1 create blog
```

출력에 `database_id = "..."` 가 찍힌다. 이 값을 `wrangler.toml` 의 `[[d1_databases]]` 블록 두 자리(`database_id`, `preview_database_id`) 모두에 채워넣고 commit & push:

```toml
[[d1_databases]]
binding = "DB"
database_name = "blog"
database_id = "여기에 붙여넣기"
preview_database_id = "여기에 붙여넣기"
migrations_dir = "./drizzle"
```

원격 마이그레이션 적용:

```bash
wrangler d1 migrations apply blog --remote
```

원격 시드는 보통 생략 — 어드민에서 직접 글을 쓰면 된다. 굳이 시드하려면:

```bash
node --import tsx scripts/seed.ts
wrangler d1 execute blog --remote --file=drizzle/seed.sql
```

### 7. Pages 환경변수 / 시크릿 설정

Pages 대시보드 → 프로젝트 → **Settings → Variables and Secrets**.

`wrangler.toml` 의 `[vars]` 블록에 이미 들어있는 값(`PUBLIC_SITE_URL`, `OWNER_EMAIL`, `OWNER_NAME`, `AUTH_MODE`, `PUBLIC_TURNSTILE_SITE_KEY`)은 자동으로 적용되므로 **대시보드에는 시크릿만** 추가하면 된다.

| 키 | 타입 | 비고 |
| --- | --- | --- |
| `JWT_SECRET` | Secret | `password` 모드일 때 필수. `openssl rand -hex 32` |
| `IP_HASH_SALT` | Secret | 댓글 IP 해시용. `openssl rand -hex 32` |
| `TURNSTILE_SECRET` | Secret | Turnstile 등록 후 받은 값 (11단계) |
| `ADMIN_PASSWORD_HASH` | Secret | `password` 모드일 때 필수. `pnpm hash-password "비번"` 출력 |

평문 값을 `wrangler.toml` 에 두는 대신 대시보드에 두고 싶다면 같은 키를 "Plaintext" 타입으로 추가해도 된다. 둘 다 있으면 대시보드 값이 우선한다.

### 8. Pages D1 바인딩

Pages → 프로젝트 → **Settings → Functions → D1 database bindings**.
- Variable name: `DB`
- D1 database: `blog` (6단계에서 만든 것)

Production / Preview 둘 다 등록한다.

### 9. Cloudflare R2 (이미지 업로드)

어드민에서 본문/커버 이미지를 업로드하려면 R2 버킷이 필요하다.

**R2 활성화 (계정에 R2를 처음 쓰는 경우 한 번):**

1. 대시보드 좌측 사이드바 → **R2 Object Storage** 클릭.
2. "Purchase R2 Plan" / "Get Started" → 결제 수단 등록.
3. 무료 티어(저장 10GB / 월 클래스A 1M / 클래스B 10M) 안에서는 청구 0원이지만 **카드 등록은 필요**하다. 등록 안 하면 `wrangler r2 bucket create` 가 Cloudflare API 에러로 실패한다.

**버킷 생성:**

```bash
wrangler r2 bucket create blog-uploads
```

(이름을 바꿀 거면 `wrangler.toml` 의 `[[r2_buckets]]` 블록도 같이 수정.)

**Pages R2 바인딩:**

Pages → 프로젝트 → **Settings → Functions → R2 bucket bindings**.
- Variable name: `UPLOADS`
- R2 bucket: `blog-uploads`

Production / Preview 둘 다 등록한다. 이게 누락되면 어드민 업로드 시 500 에러가 뜬다.

### 10. (옵션) Cloudflare Access — `AUTH_MODE=cf_access` 일 때

`password` 모드를 쓰면 이 단계는 건너뛴다.

1. Cloudflare Zero Trust → Access → Applications → Add → Self-hosted.
2. Application domain: `<project>.pages.dev` 또는 커스텀 도메인.
3. Path 를 `/admin*` 로 추가하고, 같은 앱 또는 별도 앱에 `/api/admin*` 도 추가한다.
4. Identity provider: One-time PIN (기본 제공 이메일 OTP).
5. Policy:
   - Action: Allow
   - Include: `Emails` → `OWNER_EMAIL` 과 같은 이메일
6. Save.

이제 `/admin/*` 과 `/api/admin/*` 은 OTP 인증을 거친 본인만 접근한다.

### 11. Turnstile

1. Cloudflare 대시보드 → Turnstile → Add site.
2. Domain 입력 시 주의: `*.pages.dev` 같은 와일드카드는 막혀 있고, **`<project>.pages.dev` 같은 bare hostname** 은 보통 받아준다. 거부되면 다음 중 하나로 우회:
   - **테스트 키 사용**: 사이트 등록을 건너뛰고 아래 공식 테스트 키를 그대로 쓴다. 댓글 폼은 동작하지만 실제 봇 차단은 없음.
     ```
     PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
     TURNSTILE_SECRET=1x0000000000000000000000000000000AA
     ```
   - **커스텀 도메인 사용**: Cloudflare Registrar 등에서 도메인을 사서 Pages 에 연결한 뒤 그 도메인으로 등록.
3. Widget mode: Managed.
4. 발급받은 Site key / Secret key 를:
   - Site key → `wrangler.toml` 의 `PUBLIC_TURNSTILE_SITE_KEY` 값 교체 후 push, 또는 Pages 대시보드 환경변수에 평문으로 추가
   - Secret → Pages 대시보드 **Secret** 으로 추가 (`TURNSTILE_SECRET`)

### 12. 재배포 + 첫 글 작성

5단계의 첫 빌드가 실패했었다면 Pages → Deployments → 최신 실패 항목 → **Retry deployment**. 또는 그냥 새 commit 을 push 해도 된다.

배포가 끝나면:

1. `/admin/login` (password 모드) 또는 `/admin` (cf_access 모드) 에 접근해 로그인.
2. `/admin/posts/new` 에서 글 작성. 본문 툴바에서 이미지 버튼을 눌러 R2 업로드를 한 번 검증.
3. 발행 후 `/` 에 노출되는지, 이미지가 정상 로드되는지 (`/uploads/<key>` 200) 확인.

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

### 바인딩 (env var이 아닌 것)

다음은 환경변수가 아니라 `wrangler.toml` 선언 + Cloudflare Pages 대시보드 바인딩으로 연결한다.

| 바인딩 이름 | 종류 | 연결 대상 |
| --- | --- | --- |
| `DB` | D1 database | `blog` (6단계에서 생성) |
| `UPLOADS` | R2 bucket | `blog-uploads` (9단계에서 생성) |

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
- [ ] 어드민 본문 이미지 / 커버 이미지 업로드 → 글 페이지에서 정상 노출 (`/uploads/<key>` 200)

## 🪪 라이선스

MIT

## 🇬🇧 English (short)

A pastel-toned personal tech blog template. Astro SSR + Cloudflare D1 + R2 + Drizzle + Turnstile + optional Cloudflare Access. Free hosting.

Quick start:

1. Fork & clone, `pnpm install`.
2. `cp .env.example .dev.vars`, fill in.
3. `wrangler d1 migrations apply blog --local && pnpm seed && pnpm dev`.
4. Push to GitHub, connect to Cloudflare Pages.
5. `wrangler d1 create blog`, paste `database_id` into `wrangler.toml`, push, then `wrangler d1 migrations apply blog --remote`.
6. In Pages dashboard: add secrets (`JWT_SECRET`, `IP_HASH_SALT`, `TURNSTILE_SECRET`, `ADMIN_PASSWORD_HASH`) and bind D1 (`DB`).
7. Activate R2 (requires payment method on file; free tier is $0), `wrangler r2 bucket create blog-uploads`, then bind R2 (`UPLOADS`) in Pages.
8. Register a Turnstile site (use bare `<project>.pages.dev`, or fall back to public test keys if rejected).
9. Optional: set up Cloudflare Access for `/admin*` and `/api/admin*` if `AUTH_MODE=cf_access`.
10. Retry the deployment.

See the Korean section above for full details.
