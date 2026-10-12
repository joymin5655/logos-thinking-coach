# LOGOS Content Audit Report

> **Audited:** 2026-05-15
> **Sources:** `LOGOS_경진대회_피치덱.pptx` (15 slides), `LOGOS_모두의창업_지원서.docx` (Q1-Q4)
> **Target:** `logos-thinking-coach` repo + Vercel 라이브 (https://logos-thinking-coach.vercel.app)

---

## Summary

| Status | Count | % |
|---|---|---|
| ✅ Fully aligned | 17 | 36% |
| △ Partial / 라벨 불일치 | 11 | 23% |
| ❌ Missing | 14 | 30% |
| N/A (의도된 비노출 / 로드맵 외) | 5 | 11% |
| **Total** | **47** | **100%** |

**Critical gaps:** Problem 인용(MIT/MS/계단의 철학) 전무, 시장 통계·로드맵·팀 페이지 부재, 가격 plan features 불일치.

---

## A. 브랜드 & 포지셔닝 (6)

| # | 항목 | 상태 | 위치 | 비고 |
|---|---|---|---|---|
| A1 | "The AI That Never Answers" | ✅ | `Landing.tsx:194` | Primary slogan, ACCENT 강조 |
| A2 | "스스로 납득하는 힘" | ✅ | `Landing.tsx:249` | HIGHLIGHT 강조 |
| A3 | "AI 시대, 답을 주지 않는 유일한 서비스" | △ | — | 영문 슬로건은 있으나 **한글 본문 부재** |
| A4 | `<title>` / og:meta | ✅ | `client/index.html` | "LOGOS — 소크라테스 씽킹 코치" |
| A5 | Q1 한 줄 (58자, "면접·발표에서 말문이…") | ❌ | — | 카피 어디에도 없음 |
| A6 | `contact@lo9os.org` | ❌ | — | 푸터·About 모두 노출 X |

## B. 문제 정의 (5)

| # | 항목 | 상태 | 위치 | 비고 |
|---|---|---|---|---|
| B1 | Cognitive Debt (MIT Media Lab 2025) | ❌ | — | 인용 전무 |
| B2 | Microsoft Research CHI 2025 | ❌ | — | 인용 전무 |
| B3 | L'esprit de l'escalier (계단의 철학) | ❌ | — | 핵심 메타포인데 미사용 |
| B4 | 편도체 하이재킹 | ✅ | `ThinkingSession.tsx` Pressure Mode tooltip | "편도체 하이재킹 시뮬레이션" |
| B5 | 3열 비교 (범용 AI / 기존 소크라테스 / LOGOS) | ❌ | — | Features 카드는 있으나 비교표 부재 |

## C. 솔루션 & 핵심 기술 (6)

| # | 항목 | 상태 | 위치 | 비고 |
|---|---|---|---|---|
| C1 | Recovery Logic (Aporia→Conviction) | ✅ | `ThinkingSession.tsx` `handleAporia` | recoveryMode state + Acknowledge/Anchor/Reconstruct 3-step |
| C2 | 4단계 라벨 — **표면/도전/핵심/통합** | △ | `ThinkingSession.tsx:24` | **현재: 표면/전제/본질/통합** — PITCH와 라벨 불일치 ⚠ |
| C3 | "AI는 질문만 한다" 정체성 카피 | ❌ | — | 마케팅 페이지에 명시 X |
| C4 | 타입 분기 — 고민형/지적형/검증형 | △ | `ThinkingSession.tsx` `classifyTopic` Type A/B/C | 코드 분기는 있으나 **한글 라벨 미사용** (스펙상 사용자 미노출이라 의도일 수도) |
| C5 | Conviction(납득) 설계 — "반드시 납득으로" | △ | Landing 슬로건만 | 완료화면(`phase==='complete'`)에 "납득" 라벨 부재 |
| C6 | 공통 첫 질문 → 답변 패턴 분석 | △ | `getQuestion(stage)` | 첫 질문이 STAGE_QUESTIONS['표면']에서 랜덤. 공통 단일 질문 X |

## D. 3개 세션 구조 (15)

### Session 1 — 논증 세션 / Argue.tsx
| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| D1 | 매일 10-20분 명시 | ❌ | 카피에 없음 |
| D2 | 분야 선택 → AI 주제 생성 | ✅ | preferences.ts + DAILY_TOPICS field 매핑 |
| D3 | 소크라테스 반문 2-3라운드 | ✅ | 3 라운드 구현 |
| D4 | 최종 정리는 사용자가 직접 | △ | UX 확인 필요 (마지막 단계가 사용자 입력인지) |
| D5 | 스코어 + 스트릭 + 랭킹 | ✅ | 완료화면 + DashboardHome rank cards |

### Session 2 — 소크라테스 코칭 / ThinkingSession.tsx
| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| D6 | 사용자가 직접 주제 입력 | ✅ | intro phase |
| D7 | AI 타입 감지 → 자동 분기 | ✅ | classifyTopic + 분기별 첫 질문 |
| D8 | 대화 깊이 4단계 | ✅ | STAGES (라벨 ⚠ C2 참조) |
| D9 | Recovery Logic 작동 | ✅ | handleAporia |
| D10 | 세션 리포트: 빈틈 공개 | △ | 완료화면 3 metric은 있으나 "빈틈" 명시 부재 |

### Session 3 — 아레나 / Arena.tsx
| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| D11 | AI 배틀 항상 가능 (Free) | △ | plans.ts Free features에 "AI 배틀 무제한" 명시 X |
| D12 | AI가 질문으로 논리 공격 | ✅ | 4 라운드 디베이트 구조 |
| D13 | User vs User | N/A | PITCH 12 로드맵상 2027 Q1 — 현재 미구현이 정상 |
| D14 | AI 심판 채점 공개 | ✅ | judge() + 결과화면 3 metric |
| D15 | 랭킹 반영 — 바이럴 | ✅ | rankDelta + DashboardHome |

## E. 비즈니스 모델 (5)

| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| E1 | Free: Session1 일3회 / Session2 일1회 / AI배틀 무제한 / 기본 스코어 / 분야별 기본 랭킹 | △ | `plans.ts` Free features에 **"일 3회 씽킹 세션"** 단일 항목만. PITCH의 세션별 분리·AI배틀 무제한·분야별 랭킹 누락 |
| E2 | Pro: 전 세션 무제한 / 상세 리포트 / 성장 히스토리 / **User vs User 아레나** / 고급 랭킹 통계 | △ | `plans.ts` Pro에 **"4가지 AI 페르소나"** (PITCH에 없는 항목), **User vs User 아레나 누락** |
| E3 | Team: 월 99,000원/10인 / 학원·기업 / 관리자 대시보드 / 진도·리포트 일괄 / 교육기관 파트너십 | △ | 가격/관리자 대시보드 ✅, "학원·기업·교육기관 파트너십" 카피 누락 |
| E4 | 연 20% 할인 | ✅ | `YEARLY_DISCOUNT = 0.2` + PlanCards billing toggle |
| E5 | 목표 전환율 8-10% | N/A | 내부 KPI (UI 비노출 정당) |

## F. 시장 / 로드맵 / 지표 / 팀 (10)

| # | 항목 | 상태 | 위치 후보 |
|---|---|---|---|
| F1 | 글로벌 에듀테크 404조원 | ❌ | About 또는 새 Market section |
| F2 | AI 교육 연 45% 성장 (2030) | ❌ | 동일 |
| F3 | 국내 사교육 29.2조원 | ❌ | 동일 |
| F4 | WEF #1 분석적 사고 | ❌ | 동일 |
| F5 | 5단계 로드맵 (2026Q2~2027Q2+) | ❌ | About 하단 또는 별도 `/roadmap` 페이지 |
| F6 | KPI (완주율 60%/전환율 8-10%/리텐션 40%/MAU 1,000) | N/A | 내부 지표 |
| F7 | 팀 3인 소개 | ❌ | About 하단 또는 별도 `/team` |
| F8 | Claude API/Code/Codex 활용 명시 | N/A | 마케팅 페이지엔 보통 비노출 (선택) |
| F9 | 의공학 배경 / "사용하기만 해도" 시스템 철학 | ❌ | About 스토리텔링에 강한 카피로 활용 가치 큼 |
| F10 | 3가지 장면 (방어/결정/계단의 깨달음) | ❌ | About Problem 섹션의 핵심 시나리오로 강력 |

---

## 🔥 Critical Gaps (P0 — 즉시 수정)

### P0-1. 4단계 라벨 PITCH 정합 ⚠
- **현재:** `STAGES = ['표면', '전제', '본질', '통합']`
- **PITCH:** `Level 1 표면 / Level 2 도전 / Level 3 핵심 / Level 4 통합`
- **영향:** Pitch 자료 자체와 제품 UI가 다른 단어를 쓰면 일관성 훼손
- **수정:** `ThinkingSession.tsx:24` STAGE 라벨 2개 변경 + STAGE_DESC도 정합
- **예상:** 5분

### P0-2. Pro Plan features 정정
- 현재 `"4가지 AI 페르소나"` ← PITCH에 없음 (제거)
- 현재 누락 `"User vs User 아레나"` ← PITCH 핵심 차별점 (추가)
- 현재 누락 `"성장 히스토리 분석"` ← PITCH 명시 (추가, "성장 추이 그래프"와 별개 가능)
- **수정:** `shared/plans.ts` Pro features 재정렬
- **예상:** 10분

### P0-3. Free Plan features 세분화
- 현재 `"일 3회 씽킹 세션"` 단일
- PITCH 정합: `"Session 1 일 3회"` + `"Session 2 일 1회"` + `"AI 배틀 무제한"` + `"기본 논리력 스코어"` + `"분야별 기본 랭킹"`
- **수정:** `shared/plans.ts` Free features 재작성
- **예상:** 10분

---

## 📢 P1 — 마케팅 컨텐츠 보강

### P1-1. About 페이지 전면 확장
현재 About은 3-step 카드만. 다음을 추가:
- **Problem 섹션:** Cognitive Debt (MIT) + Microsoft CHI + 계단의 철학 인용 카드 3개
- **3 시나리오 카드:** 아이디어 방어 / 결정 / 계단의 깨달음
- **Founder Story:** "의공학 배경 → 사용하기만 해도" 짧은 단락
- **이메일 노출:** 페이지 하단
- **예상:** 1시간

### P1-2. Market 섹션 (About 또는 Features 확장)
4 stat 카드: `404조 / 45%↑ / 29.2조 / WEF #1`
- **위치:** About 또는 Features 하단
- **예상:** 30분

### P1-3. Team 소개
PITCH 13 기반 — 3인 카드 (대표 / 프로덕트 / 마케팅)
- **위치:** About 하단 또는 별도 라우트
- **현재:** 실명/사진 비공개 → "[이름 1]" 그대로 또는 익명 카드
- **예상:** 30분

### P1-4. Roadmap 섹션
5단계 타임라인 (Q2~Q2+).
- **위치:** About 하단 또는 별도 `/roadmap`
- **예상:** 40분

### P1-5. Footer 이메일 + Q1 한 줄
- MarketingLayout 푸터에 `contact@lo9os.org` 추가
- Landing 또는 About에 Q1 58자 핵심 카피 추가
- **예상:** 15분

---

## 🎨 P2 — 디테일 정합

### P2-1. ThinkingSession 완료화면 "납득" 라벨
- 현재 `"SESSION COMPLETE"` + `"Logic Score"` 78
- PITCH 정합: `"CONVICTION REACHED — 납득에 도달했습니다"` 같은 키 카피 추가
- **예상:** 5분

### P2-2. "AI는 질문만 한다" 카피 노출
- Features 카드 또는 About 헤드라인에 단일 강조 라인
- **예상:** 10분

### P2-3. Argue intro 카피
- "매일 10-20분, 분야별로 논리를 단련합니다" 한 줄 추가
- **예상:** 5분

---

## ⏱ 권장 실행 순서

| 순서 | 작업 | 누적 시간 | 산출 commit 1개 단위 |
|---|---|---|---|
| 1 | P0 (모두) — 라벨/플랜 정합 | 25분 | `fix: align stage labels & plan features with PITCH` |
| 2 | P1-5 (Footer/이메일/Q1) | 40분 | `feat: add footer contact + Q1 tagline` |
| 3 | P1-1 (About Problem+Scenario+Founder) | 1시간 40분 | `feat(about): add cognitive-debt research + 3 scenarios` |
| 4 | P1-2 (Market 4 stats) | 2시간 10분 | `feat(about): add market sizing stats` |
| 5 | P1-3 (Team) + P1-4 (Roadmap) | 3시간 20분 | `feat(about): add team + roadmap` |
| 6 | P2 디테일 일괄 | 3시간 40분 | `polish: conviction label + "questions only" copy` |

---

## 부록 — 추출된 핵심 텍스트 인용 (즉시 사용 가능)

### Q1 한 줄 (58자)
> 면접·발표에서 말문이 막히는 건 의지 문제가 아닙니다. LOGOS가 소크라테스 반문으로 압박 속에서도 꺼낼 수 있는 논리를 훈련합니다.

### Problem — 3 인용
> **MIT Media Lab (2025):** LLM 반복 사용 그룹의 뇌 연결성·언어 능력 저하 — "Cognitive Debt (인지 부채)"
> **Microsoft Research CHI 2025:** AI에 대한 신뢰가 높을수록 비판적 사고 노력이 유의미하게 감소
> **L'esprit de l'escalier:** 집에 오는 길에야 완벽한 논리가 떠오르는 현상 — 의지의 문제가 아닌 편도체 하이재킹

### Founder Story 한 단락 (Q2 압축)
> 의공학을 공부하며 배운 원칙: 잘 만들어진 시스템은 사용자에게 올바른 사용법을 요구하지 않는다. 사용자의 의지에 기대지 않고, 사용하기만 해도 사고력이 성장하는 시스템 — 그것이 LOGOS의 출발점입니다.

### 3 시나리오 (Q3)
> **방어:** AI로 다듬은 기획안 — 반박 질문 앞에 무너지는 순간
> **결정:** AI에게 답을 받았지만 그 이유를 설명할 수 없는 순간
> **계단:** 대화가 끝난 후에야 완벽한 반박이 떠오르는 순간

### 시장 통계 (PITCH 8)
> 글로벌 에듀테크 **404조원** · AI 교육 **연 45%↑** · 국내 사교육 **29.2조원** · WEF 핵심 역량 **#1 분석적 사고**

### 로드맵 5단계
> 2026 Q2 기반 정비 → Q3 MVP (100명, 완주율) → Q4 검증 (완주율 60%+/리텐션 40%+) → 2027 Q1 성장 (1,000명, UvU, MRR) → Q2+ 확장 (모바일·B2B·투자유치)

---

## 다음 단계

이 보고서를 받고 진행할 항목 선택:
- **A.** P0만 우선 (25분, 1 commit)
- **B.** P0+P1 모두 (3시간, 5 commit)
- **C.** 전체 P2까지 (3시간 40분, 6 commit)

어느 안으로 갈지 알려주세요.
