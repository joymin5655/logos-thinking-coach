# /api/coach 계약 (v2, 2026-10-13)

`POST /api/coach` · `content-type: application/json` · 로그인 사용자는 `Authorization: Bearer <Supabase access token>`.

## 공통 요청 필드
| 필드 | 타입 | 비고 |
|---|---|---|
| `action` | 아래 액션 중 하나 | |
| `sid` | uuid | 세션·판·진단 1건의 id. 한도는 sid 단위로 센다 |
| `locale` | `"ko" \| "en"` (선택, 기본 ko) | AI 출력 언어 |

## 액션
| action | kind(한도) | 추가 필드 | 응답 |
|---|---|---|---|
| `session.turn` | session | `topic ≤200, stage, history ≤16, message 1..1000, control?, anchor?` | `{question, stage, detectedType, aporia}` |
| `session.report` | session | `topic, history ≤24` | `{stuckPoints 1..3, assumptions 1..3, nextQuestions 1..3, turningPoint}` |
| `argue.turn` | argue | `topic, position, round 1..3, history ≤8, message` | `{question, targetWeakness}` |
| `score` | `kind` 필드 | `kind: "diagnostic"\|"session"\|"argue"`, `text ≤2000, context?` | `{consistency, evidence, defense, total, rationale}` |
| `arena.turn` | arena | `topicId`(shared/arenaTopics), `side: "pro"\|"con"`(사용자 입장), `round 1..3, history ≤6, message 1..1000` | `{argument, targetsClaim}` |
| `arena.judge` | arena | `topicId, side, transcript 2..6`(user로 시작, user/assistant 교대) | `{consistency, evidence, defense, total, verdict: "win"\|"draw"\|"lose", rationale, lessons: [{quote, lesson}] 1..3}` |

모든 성공 응답에 `promptVersion`이 붙는다. 문자열 길이는 스키마로 거부하지 않고, 서버가 `OUTPUT_CAPS`(server/logos/schemas.ts) 길이로 잘라 보낸다(넘친 끝은 `…`). 배열은 최대 3개.

## 인증·한도
- 비로그인 허용: `action:"score"` + `kind:"diagnostic"`만. IP(IPv6 /64)당 하루 `GUEST_DIAGNOSTICS_PER_DAY`.
- 그 외는 Bearer 필수. 서버가 `rpc/consume_quota`를 사용자 토큰으로 호출해 인증과 한도를 한 번에 처리한다(`shared/quotas.ts`).
- 판정(verdict)은 서버가 total로 계산: ≥70 win, 45–65 draw, ≤40 lose.

## 오류 응답 `{ code, error }`
| status | code | 클라이언트 처리 |
|---|---|---|
| 400 | `bad_request` | 일반 오류 문구 |
| 401 | `auth` | 로그인 화면으로(`/login?next=`) |
| 403 | `origin` | 일반 오류 문구 |
| 405 / 413 / 415 | `bad_request` | 일반 오류 문구 |
| 429 | `quota` (+`reason: day\|refs\|ref_calls`) | 오늘 한도 소진 안내 |
| 429 | `rate` | 잠시 후 다시 |
| 502 | `upstream` | AI 응답 실패, 다시 시도 |
| 503 | `unavailable` | 준비 중(키·Supabase 미설정 또는 장애) |

`error` 문구는 한국어 기본값이고, 클라이언트는 `code`로 자기 언어 문구를 고른다.
