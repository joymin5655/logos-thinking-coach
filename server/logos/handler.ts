import { COACH_MODEL, SCORE_MODEL, callStructured, createClient, type LlmClient } from "./anthropic.js";
import { checkRequest, readBody } from "./guard.js";
import {
  ARGUE_SYSTEM,
  PROMPT_VERSION,
  REPORT_SYSTEM,
  SCORE_SYSTEM,
  SESSION_SYSTEM,
  STAGES,
  type Stage,
} from "./prompts.js";
import {
  argueOutputSchema,
  reportOutputSchema,
  requestSchema,
  scoreOutputSchema,
  turnOutputSchema,
  type CoachRequest,
  type TurnItem,
} from "./schemas.js";

type Env = Record<string, string | undefined>;
export interface CoachDeps {
  /** 테스트용 주입. 지정하지 않으면 env의 키로 만든다. */
  client?: LlmClient | null;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

const fmtHistory = (history: TurnItem[]) =>
  history.map((h) => `${h.role === "user" ? "사용자" : "코치"}: ${h.content}`).join("\n");

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

async function run(req: CoachRequest, client: LlmClient): Promise<Record<string, unknown>> {
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
      const out = await callStructured(client, {
        model: COACH_MODEL,
        system: SESSION_SYSTEM,
        user,
        schema: turnOutputSchema,
        effort: "low",
        maxTokens: 2000,
      });
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
      return callStructured(client, {
        model: COACH_MODEL,
        system: ARGUE_SYSTEM,
        user,
        schema: argueOutputSchema,
        effort: "low",
        maxTokens: 2000,
      });
    }
    case "session.report":
      return callStructured(client, {
        model: COACH_MODEL,
        system: REPORT_SYSTEM,
        user: `<context>\n주제: ${req.topic}\n</context>\n<history>\n${fmtHistory(req.history)}\n</history>`,
        schema: reportOutputSchema,
        effort: "medium",
        maxTokens: 4000,
      });
    case "score": {
      const out = await callStructured(client, {
        model: SCORE_MODEL,
        system: SCORE_SYSTEM,
        user: `${req.context ? `<context>\n${req.context}\n</context>\n` : ""}<text>\n${req.text}\n</text>`,
        schema: scoreOutputSchema,
        effort: "low",
        maxTokens: 2000,
      });
      return { ...out, total: out.consistency + out.evidence + out.defense };
    }
  }
}

export async function handleCoach(request: Request, env: Env, deps: CoachDeps = {}): Promise<Response> {
  const fail = checkRequest(request, env);
  if (fail) return json(fail.status, { error: fail.error });

  const raw = await readBody(request);
  if (typeof raw !== "string") return json(raw.status, { error: raw.error });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return json(400, { error: "요청 형식이 올바르지 않아요." });
  }
  const parsed = requestSchema.safeParse(parsedJson);
  if (!parsed.success) return json(400, { error: "요청 형식이 올바르지 않아요." });

  const client = deps.client !== undefined ? deps.client : createClient(env);
  if (!client) return json(503, { error: "AI 코치가 아직 준비되지 않았어요." });

  const action = parsed.data.action;
  try {
    const result = await run(parsed.data, client);
    return json(200, { ...result, promptVersion: PROMPT_VERSION });
  } catch (err) {
    // 요청/응답 본문·헤더·SDK 메시지는 기록하지 않는다.
    const status = (err as { status?: unknown } | null)?.status;
    console.error("[coach]", action, (err as object | null)?.constructor?.name, typeof status === "number" ? status : undefined);
    return json(502, { error: "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요." });
  }
}
