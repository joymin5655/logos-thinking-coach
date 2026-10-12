# LOGOS — Design System

> **Tagline:** AI 씽킹 코칭 — 소크라테스 문답법으로 논리의 빈틈을 발견하고 더 깊이 사고하는 힘을 기른다.
> **Aesthetic:** UIMIX 스타일 — 기술적 엄밀함 + 지적 권위. 모노스페이스 라벨 + 세리프 제목 + 크림/블랙 대비.

---

## 1. Color Palette

### Brand (raw)
| 토큰 | 값 | 용도 |
|---|---|---|
| `BLACK` | `#0A0A0A` | 메인 배경 (Hero, Features, Dashboard) |
| `CREAM` | `#F0EBE0` | 메인 텍스트 / 카드 배경 (About, Pricing) |
| `CREAM_MID` | `rgba(240,235,224,0.55)` | 본문 텍스트 (다크 배경) |
| `CREAM_DIM` | `rgba(240,235,224,0.25)` | 보더, 구분선 |
| `CREAM_FAINT` | `rgba(240,235,224,0.06)` | 패널 미세 배경 |
| `ACCENT` | `#C8C0A8` | 버튼 호버, 강조 (브론즈 골드) |
| `NEAR_BK` | `#111111` | Dashboard 보조 표면 |
| `#0F0F0F` | — | Features 섹션 배경 (BLACK과 미세 분리) |

### Unicorn Studio 토큰 (`:root`)
- `--logos-sage`: `#C8C8B6`
- `--logos-dark`: `#262618`
- `--logos-dark-mid`: `#3A3A28`
- `--logos-muted`: `#7A7D6E`

세이지 그린 라이트 테마는 dashboard shadcn 컴포넌트용. 마케팅 페이지(`/`, `/about`, `/features`, `/pricing`)는 블랙·크림 직접 사용.

---

## 2. Typography

### Font CSS Variables (`client/src/index.css:55-58`)
```css
--font-mono:    'Space Mono', 'Pretendard Variable', 'Pretendard', -apple-system, monospace;
--font-serif:   'Source Serif 4', 'Pretendard Variable', 'Pretendard', Georgia, serif;
--font-display: 'Outfit', 'Pretendard Variable', 'Pretendard', sans-serif;
```

**원칙:** 라틴 글자는 Space Mono / Source Serif 4, **한글은 Pretendard Variable로 자동 폴백**. 인라인 `fontFamily` 사용 시 반드시 `var(--font-mono)` 또는 `var(--font-serif)` 형태로 작성 (직접 문자열 금지).

### 외부 폰트 로딩 (`client/index.html`)
- Google Fonts: Space Mono · Source Serif 4 · Outfit
- jsDelivr CDN: Pretendard Variable v1.3.9

### 사용 규칙
| 용도 | font-family | 예시 |
|---|---|---|
| UI 라벨, 본문 모노 | `var(--font-mono)` | "001", "ABOUT LOGOS", 설명 단락 |
| H1 (대형) | `var(--font-mono)`, weight 700, uppercase | "THINK DEEPER" |
| H2 (섹션) | `var(--font-serif)`, weight 600 | "소크라테스가 AI가 되다" |
| 가격 수치 | `var(--font-serif)`, weight 700 | "₩9,900" |

### Type Scale (인라인 px 기준)
- 8px / letter-spacing 0.25–0.42em → 메타 라벨 (마이크로 캡)
- 9–10px → 캡션, 마퀴, 푸터, nav 링크
- 11px / line-height 1.85 → 본문 단락
- 18px → 아이콘 (◎◈◉) 카드 헤더
- `clamp(1.7rem, 3.2vw, 2.6rem)` → H2 반응형
- `clamp(2.4rem, 5vw, 4.2rem)` → Hero H1 반응형

---

## 3. Global UI Scale & Layout

### Scale 변수 (`client/src/index.css`)
```css
:root { --ui-scale: 1.3; }
#root { zoom: var(--ui-scale); }
.ui-scale-reset { zoom: calc(1 / var(--ui-scale)); }
.fit-viewport { height: calc(100dvh / var(--ui-scale)); }
```

- `--ui-scale` 한 값만 바꾸면 전체 UI 비율 조정.
- `.ui-scale-reset` 는 3D 동상처럼 원본 좌표가 필요한 서브트리에 적용.
- `.fit-viewport` 는 페이지가 정확히 viewport 1개 안에 들도록 강제.

### 두 가지 레이아웃
1. **`MarketingLayout`** — 공개 페이지 (`/`, `/about`, `/features`, `/pricing`)
   - 고정 헤더 (`position: fixed`, 52px) + main + 푸터
   - prop `singleViewport: boolean` — 활성 시 `.fit-viewport` 적용, main `flex: 1; overflow: hidden`
   - prop `footer?: ReactNode` — 미지정 시 기본 마퀴 푸터
2. **`DashboardLayout`** — 인증 영역 (`/dashboard/*`)
   - 좌측 사이드바 + 우측 콘텐츠. shadcn 토큰 사용.

### 헤더 (MarketingLayout)
구조: `[로고 + EST.2026] | [flex spacer] | [About · Features · Pricing] | [시작하기]`
- 활성 라우트: cream 풀 컬러 + 하단 1px 밑줄
- 비활성: `CREAM_MID`, hover 시 풀 cream

### 푸터
- **기본**: 마퀴 한 줄 — "LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 ·" (22s 무한 루프, 양쪽 페이드 마스크)
- **Landing (`/`)**: 2-row — 마퀴(상) + SYSTEM 정보(하: `SYSTEM.ACTIVE · V1.0.0 · ◐ RENDERING · FRAME: ∞`)

---

## 4. Pages

### 공개 (MarketingLayout, 모두 `singleViewport`)

| 경로 | 컴포넌트 | 배경 | 콘텐츠 | 특이사항 |
|---|---|---|---|---|
| `/` | `Landing` | BLACK | Hero ("THINK DEEPER") | 3D 동상 + 스포트라이트 + 코너 프레임 + 도트 패턴, 커스텀 SYSTEM 푸터 |
| `/about` | `About` | CREAM | "소크라테스가 AI가 되다" + 3 step | 2-col grid |
| `/features` | `Features` | `#0F0F0F` | "논리의 빈틈을 스스로 발견하다" + 3 카드 | 1px 그리드 보더 |
| `/pricing` | `Pricing` | CREAM | "생각의 깊이에 투자하세요" + 3 플랜 (Free/Pro/Team) | Pro 카드 다크 강조 |

### 인증 (DashboardLayout)

| 경로 | 컴포넌트 | 역할 |
|---|---|---|
| `/dashboard` | `DashboardHome` | 홈 (오늘 세션 / 빠른 시작) |
| `/dashboard/session` | `ThinkingSession` | 실시간 코칭 세션 UI (ElevenLabs 스타일) |
| `/dashboard/analytics` | `Analytics` | 논리력 분석 그래프 |
| `/dashboard/history` | `SessionHistory` | 세션 기록 |
| `/dashboard/subscription` | `Subscription` | 결제 UI (현재 플랜, 월/연 토글, FAQ) |
| `/404` | `NotFound` | — |

---

## 5. Pricing Page Strategy

### 현 상태
- `/pricing` — 공개 마케팅 (단순 카드 3개, `included` 기능만 표시)
- `/dashboard/subscription` — 인증 결제 UI (현재 플랜 배지, 월/연 빌링 토글, 전체 기능 ✓/—, FAQ)
- 두 곳 모두 **`shared/plans.ts`의 동일 `PLANS` 데이터** 사용 → 가격·기능 정합 OK

### 권장 (현재 적용된 방식)
**역할 분리 + 단일 데이터 소스 유지.**

- `/pricing` = 신규 유저 후킹용 마케팅 스냅샷
- `/dashboard/subscription` = 빌링 워크플로우 (현재 플랜, 사이클 토글, 결제)
- `/pricing` 카드의 모든 CTA → `/dashboard/subscription` 으로 직접 이동 (이전: `/dashboard` 홈으로만 이동)
- Dashboard 사이드바 "구독" → `/dashboard/subscription` (기존 유지)
- 둘 다 `PLANS` 한 곳에서 import → 가격/기능 변경 시 자동 동기화

### 대안 (적용 안 함)
- ❌ 하나로 통합 — 마케팅 페이지에 결제 UX(월/연 토글, FAQ) 섞이면 핵심 메시지 흐려짐
- ❌ 조건부 렌더 (auth 상태로 분기) — 한 컴포넌트가 두 컨텍스트 모두 책임 → 복잡도 증가

### 향후 개선
- 로그인 도입 시 `/pricing` 의 "지금 시작하기" → 로그인 안 한 유저는 `/signup?plan=pro` 같은 분기 추가
- 가격 변경은 `shared/plans.ts` 한 파일 수정으로 양쪽 동시 반영

---

## 6. Key Components

### `ThinkerModel.tsx`
- three.js + react-three-fiber 로 GLB(`/thinker.glb`, 22MB) 렌더링
- 마우스 위치에 따라 카메라 살짝 패럴랙스
- offscreen canvas 노출(`latestRenderCanvas`) — 추후 `PixelDotGrid` 와 연동 가능
- 컨테이너에 반드시 `.ui-scale-reset` 적용 (zoom 무관 원본 크기)

### `SpotlightBeam.tsx`
- 동상 위에서 내려오는 cream/gold 빔 오버레이
- props: `color: 'cream' | 'gold'`, `style?: CSSProperties`

### `MarketingLayout.tsx` (215 lines)
- props: `children`, `footer?`, `singleViewport?`
- 네비, 푸터(마퀴), 페이지 구조 일괄 처리
- 본 레이아웃 변경 = 4개 공개 페이지에 즉시 반영

### `DashboardLayout.tsx`
- 사이드바 nav 5개 항목 (홈/세션/분석/기록/구독)
- 페이지 헤더 title/titleEn props

### `MarqueeText.tsx`, `AsciiOverlay.tsx`, `PixelDotGrid.tsx`, `ShaderAnimation.tsx`
- 별도 데코 컴포넌트. 현재 미사용 (추후 활용 가능).

---

## 7. Buttons & Interactions

### Primary CTA (cream 배경)
```
padding: 10px 22px
fontFamily: var(--font-mono), weight 700, fontSize 9px
letterSpacing: 0.22em, uppercase
color: BLACK, bg: CREAM
hover: bg → ACCENT (#C8C0A8)
border: 1px solid CREAM (호버 시 ACCENT)
```
- Hero "시작하기" 는 외곽 7px 코너 마커 4개 추가 (top-left, bottom-right)

### Secondary (투명, cream 보더)
```
border: 1px solid CREAM_DIM
color: CREAM, bg: transparent
hover bg: CREAM_DIM
```

### 다크 카드 CTA (Pro 카드 등)
- border CREAM, color CREAM, transparent
- hover: bg CREAM, color BLACK

### 라이트 카드 CTA (Free/Team)
- border `rgba(10,10,10,0.25)`, color BLACK
- hover bg `rgba(10,10,10,0.06)`

---

## 8. Animations (`client/src/index.css`)

```css
@keyframes logos-marquee-left { 0% → translateX(0); 100% → translateX(-50%); }  /* 22s linear infinite */
```

페이지별 `<style>` 인라인 keyframes:
- `pulse-dot` (Landing.tsx) — 0.6→1 opacity + 1→1.3 scale, 1.4s ease-in-out, 3 dot 시차 0.2s

전환 기본 시간: 0.18s (버튼 hover), 1.4s (도트 펄스).

---

## 9. Assets (`client/public/`)

| 파일 | 출처 | 용도 |
|---|---|---|
| `logo.png` (53KB, 512×512) | `assets/fabicon/web_icon.png` 크림 변환 + 센터링 | 헤더/푸터 로고 |
| `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` | 동일 원본에서 sips 다운스케일 | 브라우저 탭/홈스크린 |
| `thinker.glb` (22MB) | `assets/statue/Meshy_AI_The_Thinker_0513041514_texture.glb` | Hero 3D 모델 |

원본 에셋은 `/Volumes/WD_BLACK SN770M 2TB/LOGOS/LOGOS_WEB/assets/` 보관. 색상/포지션 재조정 시 `/tmp/colorize_logo.py` 패턴(알파 임계 + 크림 변환 + 14% 패딩 정사각 캔버스) 참조.

---

## 10. Data — `shared/plans.ts`

```ts
type Plan = {
  id: 'free' | 'pro' | 'team';
  name: string;
  price: number;        // KRW
  period: string;       // '월' | '월 (5인)'
  description: string;
  features: { text: string; included: boolean }[];
  current?: boolean;    // dashboard 표시용
  highlight?: boolean;  // Pro = true (다크 강조 카드)
  cta: string;
};
```

`PLANS`: `[Free, Pro, Team]`. 가격이나 기능 추가 시 이 파일만 수정.

---

## 11. Routing (`client/src/App.tsx`)

```
/                          → Landing       (MarketingLayout, singleViewport)
/about                     → About         (MarketingLayout, singleViewport)
/features                  → Features      (MarketingLayout, singleViewport)
/pricing                   → Pricing       (MarketingLayout, singleViewport)
/dashboard                 → DashboardHome (DashboardLayout)
/dashboard/session         → ThinkingSession
/dashboard/analytics       → Analytics
/dashboard/history         → SessionHistory
/dashboard/subscription    → Subscription
/404 | *                   → NotFound
```

라우팅 라이브러리: **wouter v3**. `Link` (단순 nav), `useLocation` (활성 라우트 감지 + 프로그램적 이동).

---

## 12. Naming Conventions

- **공개 마케팅 페이지** 색상은 컴포넌트 상단에 const 재선언 (`BLACK`, `CREAM`, etc) — 가독성 우선
- **CSS 변수**는 폰트(`--font-*`), 스케일(`--ui-scale`), shadcn 시맨틱 토큰만 사용
- **Tailwind 클래스**는 dashboard에서 우세 (`flex`, `grid grid-cols-*`, `mb-10` 등), 마케팅에서는 인라인 스타일 우세 (정밀 픽셀 디자인)
- **번호 라벨** (001, 002, 003, 004): 각 마케팅 페이지의 섹션 ID. 의미는 페이지 순서.

---

## 13. Known Constraints

- `singleViewport` 모드는 main이 `overflow: hidden` 이라 콘텐츠가 정해진 viewport 안에 들도록 패딩/폰트 사이즈 조정 필요. 새 콘텐츠 추가 시 한 화면 룰 깨질 수 있음.
- `zoom` 속성은 모든 최신 브라우저 지원 (Firefox 126+, 2024-05).
- 3D 모델 22MB는 첫 로드에 무겁다 — production 빌드 시 GLB 압축(Draco) 또는 lazy load 고려.
- analytics(umami) 스크립트는 제거되었다. 분석 도구가 필요하면 별도로 도입한다.

---

## 14. Adding a New Marketing Page (체크리스트)

1. `client/src/pages/<Name>.tsx` 생성
2. `<MarketingLayout singleViewport>` 으로 wrap
3. 색상 const (BLACK/CREAM 등) 상단 재선언
4. Section 라벨 번호 (`005` 이상) + 가로 디바이더
5. `fontFamily: 'var(--font-mono)'` / `'var(--font-serif)'` 사용 (직접 문자열 금지)
6. `client/src/App.tsx` 에 `<Route path="/..." component={...} />` 추가
7. `MarketingLayout.tsx` `NAV_LINKS` 배열에 `{ href, label }` 추가 (헤더 노출 원할 시)
8. 한 viewport 안에 콘텐츠 핏 확인 (zoom 1.3 기준)

---

## 15. File Map (핵심)

```
client/
├── index.html                          # 폰트 link, favicon, root div
└── src/
    ├── App.tsx                         # 라우팅 (wouter)
    ├── index.css                       # CSS 변수, @theme, base layer
    ├── main.tsx                        # React 마운트
    ├── components/
    │   ├── MarketingLayout.tsx         # 공개 페이지 wrapper
    │   ├── DashboardLayout.tsx         # 인증 페이지 wrapper
    │   ├── ThinkerModel.tsx            # 3D 동상
    │   ├── SpotlightBeam.tsx           # 빔 오버레이
    │   └── ui/                         # shadcn 컴포넌트
    └── pages/
        ├── Landing.tsx                 # /
        ├── About.tsx                   # /about
        ├── Features.tsx                # /features
        ├── Pricing.tsx                 # /pricing
        ├── DashboardHome.tsx           # /dashboard
        ├── ThinkingSession.tsx         # /dashboard/session
        ├── Analytics.tsx               # /dashboard/analytics
        ├── SessionHistory.tsx          # /dashboard/history
        ├── Subscription.tsx            # /dashboard/subscription
        └── NotFound.tsx
shared/
└── plans.ts                            # PLANS 단일 출처
DESIGN.md                               # 본 문서
```
