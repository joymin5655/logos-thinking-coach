# LOGOS 제품 문서 (docs/product)

작성 2026-10-13 · 상태: 초안 · 이 폴더가 제품 정의의 정본이다. 2026-05의 옛 PRD·기능명세서·유저플로우는 "대체됨".

| 문서 | 내용 | 정본인 것 |
|---|---|---|
| [PRD.md](PRD.md) | 문제, 타깃, 멘토 피드백 대응, 성공 지표, 위험, 범위, 미정 사항 | 지표 정의, 퍼널 단계(§6.3), 범위 |
| [FEATURE_SPEC.md](FEATURE_SPEC.md) | 요구사항 R1~R9, 기능 R1-F1…, 공통 예외 E1~E11, 명세 갭 G | **기능 ID**, 예외 코드 |
| [USER_FLOWS.md](USER_FLOWS.md) | 사용자 유형별 플로우 F1~F8, 플로우 갭 UF | 단계 순서 |
| [IA_SCREENS.md](IA_SCREENS.md) | 라우트 트리, 내비게이션, 화면 설계, 계획 화면 와이어, 화면 갭 S, 목업 차이 M | 화면 구성 |
| [REVIEW.md](REVIEW.md) | 네 문서의 교차 검증, 빈 조건 점검, 여섯 관점 점검, 옛 문서와의 차이, 갭 우선순위 | 갭 우선순위 |

읽는 순서: PRD → FEATURE_SPEC → USER_FLOWS → IA_SCREENS → REVIEW. 앞 문서가 뒤 문서의 근거가 된다.

정본 관계
- 기능 ID(`Rn-Fm`, `Rn-Fm-Dk`)와 예외 코드(`E1`~`E11`)는 FEATURE_SPEC이 정한다. 다른 문서는 이를 따라 참조한다.
- 지표 정의와 퍼널 단계 이름은 PRD가 정한다. FEATURE_SPEC R7-F3과 IA_SCREENS §4.7이 이를 따른다.
- 문서 사이가 어긋나면 REVIEW.md §5의 불일치 표에 기록한다. 갭 번호는 문서별로 따로 쓴다(G·UF·S·M).

상태 표기: **구현됨**(코드 확인) / **계획(Phase 2)** / **제외**. 2026-10-13 기준 "계획(Phase 2)" 항목은 브랜치 `claude/retention-kpi`에 구현돼 있다(PR 대기, 운영 미배포). 머지·배포 뒤 라벨을 "구현됨"으로 바꾼다. 확인하지 못한 것은 "미확인"으로 적었다.

승인 목업(2026-10-13): [보드](https://claude.ai/artifact/NLGv7jYeE5ftQL57PbciK6). 명세와 달랐던 9건은 IA_SCREENS §4.9에 있고 모두 결정됐다(2026-10-13, 위임). 구현 완료 보고는 받았으나 코드 대조 전이라 문서 상태 라벨은 "계획"이다.

관련 코드 문서: `docs/FEEDBACK_PLAN.md`(멘토 피드백 1차 반영), `docs/API_CONTRACT.md`, `DESIGN.md`.
