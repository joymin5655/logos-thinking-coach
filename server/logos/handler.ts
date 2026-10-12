import { arenaTopic } from "../../shared/arenaTopics.js";
import { GUEST_DIAGNOSTICS_PER_DAY, type QuotaKind } from "../../shared/quotas.js";
import { COACH_MODEL, SCORE_MODEL, callStructured, createClient, type LlmClient } from "./anthropic.js";
import { checkRequest, clientIp, guestLimited, readBody } from "./guard.js";
import { createQuotaStore, type QuotaStore } from "./quota.js";
import {
  ARENA_SYSTEM,
  ARGUE_SYSTEM,
  JUDGE_SYSTEM,
  PROMPT_VERSION,
  REPORT_SYSTEM,
  SCORE_SYSTEM,
  SESSION_SYSTEM,
  STAGES,
  withLocale,
  type Stage,
} from "./prompts.js";
import {
  arenaJudgeOutputSchema,
  arenaTurnOutputSchema,
  argueOutputSchema,
  reportOutputSchema,
  requestSchema,
  scoreOutputSchema,
  clipOutput,
  turnOutputSchema,
  type CoachRequest,
  type TurnItem,
} from "./schemas.js";

type Env = Record<string, string | undefined>;
export interface CoachDeps {
  /** 테스트용 주입. 지정하지 않으면 env의 키로 만든다. */
  client?: LlmClient | null;
  /** 테스트용 주입. 지정하지 않으면 env의 Supabase 설정으로 만든다(없으면 null). */
  quota?: QuotaStore | null;
}

type ErrorCode = "bad_request" | "auth" | "origin" | "quota" | "rate" | "upstream" | "unavailable";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

const fail = (status: number, code: ErrorCode, error: string, extra?: Record<string, unknown>) =>
  json(status, { code, error, ...extra });

const BAD_REQUEST = "요청 형식이 올바르지 않아요.";
const MAX_TOKEN_BYTES = 4096;

const fmtHistory = (history: TurnItem[]) =>
  history.map((h) => `${h.role === "user" ? "사용자" : "코치"}: ${h.content}`).join("\n");

const fmtDebate = (history: TurnItem[]) =>
  history.map((h) => `${h.role === "user" ? "사용자" : "상대"}: ${h.content}`).join("\n");

const normalizeWs = (s: string) => s.replace(/\s+/g, " ").trim();

// 서버가 아는 현재 단계: 요청 단계에서 뒤로 가지 않고, 한 번에 한 단계까지만 앞선다.
export function clampStage(requested: Stage, proposed: Stage): Stage {
  const r = STAGES.indexOf(requested);
  const p = STAGES.indexOf(proposed);
  return STAGES[Math.min(Math.max(p, r), Math.min(r + 1, STAGES.length - 1))];
}

// 진행 속도 하한: 사용자 답변 2회마다 한 단계. 모델이 한 단계에 오래 머무는 경향(실측)을 보정한다.
// 혼란(aporia) 중이거나 THINK 요청이면 단계를 올리지 않는다.
export function paceStage(userAnswers: number): Stage {
  return STAGES[Math.min(Math.floor(userAnswers / 2), STAGES.length - 1)];
}

export function nextStage(
  requested: Stage,
  proposed: Stage,
  userAnswers: number,
  hold: boolean,
  control?: "DEEPEN" | "ENOUGH" | "THINK",
): Stage {
  if (hold) return requested;
  const floor = STAGES.indexOf(paceStage(userAnswers));
  // ENOUGH = 사용자가 이 단계를 마치겠다는 뜻이므로 최소 한 단계 진행한다.
  const enough = control === "ENOUGH" ? STAGES.indexOf(requested) + 1 : 0;
  const p = Math.max(STAGES.indexOf(proposed), floor, enough);
  return clampStage(requested, STAGES[p]);
}

/** 판정은 서버가 계산한다. 점수는 5의 배수라 45–65가 무승부 구간이다. */
export function verdictOf(total: number): "win" | "draw" | "lose" {
  if (total >= 70) return "win";
  if (total <= 40) return "lose";
  return "draw";
}

export function quotaKind(req: CoachRequest): QuotaKind {
  switch (req.action) {
    case "session.turn":
    case "session.report":
      return "session";
    case "argue.turn":
      return "argue";
    case "arena.turn":
    case "arena.judge":
      return "arena";
    case "score":
      return req.kind;
  }
}

async function run(
  req: CoachRequest,
  client: LlmClient,
  onUsage: (n: number) => void,
): Promise<Record<string, unknown>> {
  const locale = req.locale;
  switch (req.action) {
    case "session.turn": {
      const userAnswers = req.history.filter((h) => h.role === "user").length + 1;
      const recommended = paceStage(userAnswers);
      const user = [
        `<context>\n주제: ${req.topic}\n현재 단계: ${req.stage}\n사용자 답변 수: ${userAnswers}회 (권장 단계: ${recommended})${req.anchor ? `\nanchor: ${req.anchor}` : ""}\n</context>`,
        req.history.length ? `<history>\n${fmtHistory(req.history)}\n</history>` : "",
        `<message>\n${req.control ? `[CONTROL:${req.control}] ` : ""}${req.message}\n</message>`,
      ]
        .filter(Boolean)
        .join("\n");
      const out = clipOutput(await callStructured(client, {
        model: COACH_MODEL,
        system: withLocale(SESSION_SYSTEM, locale),
        user,
        schema: turnOutputSchema,
        effort: "low",
        maxTokens: 1200,
        onUsage,
      }));
      const hold = out.aporia || req.control === "THINK";
      return { ...out, stage: nextStage(req.stage, out.stage, userAnswers, hold, req.control) };
    }
    case "argue.turn": {
      const user = [
        `<context>\n주제: ${req.topic}\n사용자 입장: ${req.position}\n라운드: ${req.round}/3\n</context>`,
        req.history.length ? `<history>\n${fmtHistory(req.history)}\n</history>` : "",
        `<message>\n${req.message}\n</message>`,
      ]
        .filter(Boolean)
        .join("\n");
      return clipOutput(await callStructured(client, {
        model: COACH_MODEL,
        system: withLocale(ARGUE_SYSTEM, locale),
        user,
        schema: argueOutputSchema,
        effort: "low",
        maxTokens: 1200,
        onUsage,
      }));
    }
    case "session.report":
      return clipOutput(await callStructured(client, {
        model: COACH_MODEL,
        system: withLocale(REPORT_SYSTEM, locale),
        user: `<context>\n주제: ${req.topic}\n</context>\n<history>\n${fmtHistory(req.history)}\n</history>`,
        schema: reportOutputSchema,
        effort: "medium",
        maxTokens: 2500,
        onUsage,
      }));
    case "score": {
      const out = clipOutput(await callStructured(client, {
        model: SCORE_MODEL,
        system: withLocale(SCORE_SYSTEM, locale),
        user: `${req.context ? `<context>\n${req.context}\n</context>\n` : ""}<text>\n${req.text}\n</text>`,
        schema: scoreOutputSchema,
        effort: "low",
        maxTokens: 1000,
        onUsage,
      }));
      return { ...out, total: out.consistency + out.evidence + out.defense };
    }
    case "arena.turn": {
      // 주제는 id로만 받고(스키마가 존재를 검증), 본문은 요청 언어의 서버 측 텍스트를 쓴다.
      const topic = arenaTopic(req.topicId)![locale === "en" ? "en" : "ko"];
      const mine = req.side === "pro" ? "찬성" : "반대";
      const yours = req.side === "pro" ? "반대" : "찬성";
      const user = [
        `<context>\n주제: ${topic.title}\n(${topic.description})\n사용자 입장: ${mine}\n너의 입장: ${yours}\n라운드: ${req.round}/3\n</context>`,
        req.history.length ? `<history>\n${fmtDebate(req.history)}\n</history>` : "",
        `<message>\n${req.message}\n</message>`,
      ]
        .filter(Boolean)
        .join("\n");
      return clipOutput(await callStructured(client, {
        model: COACH_MODEL,
        system: withLocale(ARENA_SYSTEM, locale),
        user,
        schema: arenaTurnOutputSchema,
        effort: "low",
        maxTokens: 1500,
        onUsage,
      }));
    }
    case "arena.judge": {
      const topic = arenaTopic(req.topicId)![locale === "en" ? "en" : "ko"];
      const mine = req.side === "pro" ? "찬성" : "반대";
      const out = clipOutput(await callStructured(client, {
        model: SCORE_MODEL,
        system: withLocale(JUDGE_SYSTEM, locale),
        user: `<context>\n주제: ${topic.title}\n사용자 입장: ${mine}\n</context>\n<transcript>\n${fmtDebate(req.transcript)}\n</transcript>`,
        schema: arenaJudgeOutputSchema,
        effort: "low",
        maxTokens: 1800,
        onUsage,
      }));
      const total = out.consistency + out.evidence + out.defense;
      const haystack = normalizeWs(req.transcript.map((t) => t.content).join("\n"));
      // 원문에 없는 인용은 지어낸 것이므로 비운다.
      const lessons = out.lessons.map((l) => {
        const q = normalizeWs(l.quote);
        return { quote: q && haystack.includes(q) ? l.quote : "", lesson: l.lesson };
      });
      return { ...out, total, verdict: verdictOf(total), lessons };
    }
  }
}

export async function handleCoach(request: Request, env: Env, deps: CoachDeps = {}): Promise<Response> {
  const guard = checkRequest(request, env);
  if (guard) return fail(guard.status, guard.code as ErrorCode, guard.error);

  const raw = await readBody(request);
  if (typeof raw !== "string") return fail(raw.status, raw.code as ErrorCode, raw.error);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return fail(400, "bad_request", BAD_REQUEST);
  }
  const parsed = requestSchema.safeParse(parsedJson);
  if (!parsed.success) return fail(400, "bad_request", BAD_REQUEST);
  const req = parsed.data;

  const client = deps.client !== undefined ? deps.client : createClient(env);
  if (!client) return fail(503, "unavailable", "AI 코치가 아직 준비되지 않았어요.");

  // 인증·한도는 LLM 호출 전에 끝낸다. 비회원은 진단 채점만 허용한다.
  const kind = quotaKind(req);
  const needsAuth = !(req.action === "score" && req.kind === "diagnostic");
  const authz = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(authz);
  const jwt = m?.[1];
  if (jwt && jwt.length > MAX_TOKEN_BYTES) return fail(401, "auth", "로그인이 필요해요.");

  if (jwt) {
    const quota = deps.quota !== undefined ? deps.quota : createQuotaStore(env);
    if (!quota) return fail(503, "unavailable", "로그인 기능이 아직 준비되지 않았어요.");
    const res = await quota.consume(jwt, kind, req.sid, req.action);
    if ("error" in res) {
      return res.error === "unauthorized"
        ? fail(401, "auth", "로그인이 필요해요.")
        : fail(503, "unavailable", "잠시 후 다시 시도해 주세요.");
    }
    if (!res.ok) return fail(429, "quota", "오늘 이용 한도를 다 썼어요.", { reason: res.reason });
  } else if (needsAuth) {
    return fail(401, "auth", "로그인이 필요해요.");
  } else if (guestLimited(clientIp(request), GUEST_DIAGNOSTICS_PER_DAY)) {
    return fail(429, "quota", "오늘 진단 한도를 다 썼어요. 로그인하면 계속할 수 있어요.", { reason: "day" });
  }

  let outputTokens: number | undefined;
  try {
    const result = await run(req, client, (n) => {
      outputTokens = n;
    });
    console.log("[coach]", req.action, "ok", outputTokens);
    return json(200, { ...result, promptVersion: PROMPT_VERSION });
  } catch (err) {
    // 요청/응답 본문·헤더·SDK 메시지는 기록하지 않는다.
    const status = (err as { status?: unknown } | null)?.status;
    console.error("[coach]", req.action, (err as object | null)?.constructor?.name, typeof status === "number" ? status : undefined);
    return fail(502, "upstream", "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}
