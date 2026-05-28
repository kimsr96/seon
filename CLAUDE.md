# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어

모든 답변은 한국어로 작성한다.

## This is NOT the Next.js you know

Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` before writing code. Heed all deprecation notices.

**Known issue:** Turbopack crashes on non-ASCII (Korean) filesystem paths. Turbopack is explicitly disabled in `next.config.ts`. Do not re-enable it.

## Commands

```bash
# 개발 서버
npm run dev          # http://localhost:3000

# 빌드 / 린트
npm run build
npm run lint

# DB 스키마를 Supabase에 반영 (DATABASE_URL 필요)
npx prisma db push

# schema.prisma 변경 후 클라이언트 재생성
npx prisma generate

# 샘플 데이터 삽입 (앱 실행 중)
curl -X POST http://localhost:3000/api/seed
```

환경 변수는 `.env`(또는 `.env.local`)에 `DATABASE_URL`을 설정한다. 로컬 개발 시 `file:./dev.db` SQLite도 동작한다(단, prisma.config.ts의 어댑터는 pg이므로 SQLite 사용 시 lib/prisma.ts를 별도 수정 필요).

## Architecture

### 전체 구조

단일 페이지 대시보드(`app/page.tsx`)로, 미래사업팀 주간업무 데이터를 웹에서 직접 입력·수정하고 HWPX 파일로 내보낸다.

```
app/
  page.tsx            ← 전체 UI (단일 페이지 Client Component)
  layout.tsx          ← 최소 shell, globals.css import
  globals.css         ← CSS 변수 디자인 토큰 + Tailwind
  api/
    projects/         ← GET(주차 필터), POST / [id] PUT, DELETE
    expected-projects/← 동일 패턴
    participants/     ← GET, POST / [id] PUT, DELETE
    export/hwpx/      ← GET → Python subprocess → HWPX binary
    seed/             ← POST (샘플 데이터)
lib/
  prisma.ts           ← PrismaClient 싱글톤 (PrismaPg 어댑터)
scripts/
  generate_hwpx.py    ← stdin JSON → stdout HWPX binary
prisma/
  schema.prisma       ← 4개 모델
prisma.config.ts      ← Prisma 7 설정
public/templates/
  template.hwpx       ← HWPX 생성 기준 템플릿
```

### Prisma 7 구성 방식

`schema.prisma`에 `url`을 넣지 않는다. 연결 설정은 `prisma.config.ts`에서 `datasource.url`(마이그레이션)과 `migrate.adapter`(PrismaPg) 두 곳 모두 설정해야 한다. 클라이언트(`lib/prisma.ts`)는 `PrismaPg` 어댑터를 생성자에 직접 전달한다.

### HWPX 내보내기 흐름

`GET /api/export/hwpx` → DB에서 해당 주차 데이터 조회 → JSON을 `generate_hwpx.py` stdin으로 전송 → Python이 `public/templates/template.hwpx`(ZIP) 내부 XML을 `xml.etree.ElementTree`로 수정 → stdout으로 바이너리 반환.

**HWPX XML 수정 시 필수 규칙:** regex 기반 XML 편집 절대 금지. ElementTree 파서로만 노드를 조작한다. 한컴오피스가 구조 무결성 검사로 손상 파일을 읽기 전용으로 강제 전환(`IDS_MSG_CHANGE_READ_ONLY_MODE_WITH_ERRORDATA`)한다. 행 이동 시 `rowAddr`, `rowSpan`, `cellSz height`, `cellzoneList` 메타데이터를 모두 재계산해야 한다.

### 데이터 모델 핵심

- `Project.weekLabel` — `"YYYY-WNN"` 형식. 모든 조회는 이 필드로 필터링한다.
- `Project.category` — `"개찰"` 또는 `"진행중"` 두 값만 사용.
- `Participant` — `weekLabel` 없음. 전 주차 공용으로 조회된다.

### 디자인 시스템

`globals.css`에 CSS 변수로 토큰이 정의되어 있다. Tailwind arbitrary 값보다 `style={{ color: "var(--primary)" }}` 패턴을 우선 사용한다.

| 변수 | 값 | 용도 |
|------|-----|------|
| `--canvas` | `#faf9f5` | 페이지 배경 (따뜻한 크림) |
| `--surface-dark` | `#181715` | 헤더, 차트 배경 |
| `--primary` | `#cc785c` | 코랄 CTA, 강조 수치 |
| `--hairline` | `#e6dfd8` | 테두리 |
| `--ink` | `#141413` | 헤드라인 텍스트 |

세리프 헤딩은 `className="font-display"` (Cormorant Garamond, globals.css에 정의).
