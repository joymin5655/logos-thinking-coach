import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCoach, nextStage, paceStage } from "../handler";
import { resetRateLimit } from "../guard";
import { requestSchema } from "../schemas";
import type { LlmClient } from "../anthropic";
import type { QuotaResult, QuotaStore } from "../quota";

const ORIGIN = "http://localhost:3000";
const KEY_ENV = { ANTHROPIC_API_KEY: "test-key" };

const SID = "3b241101-e2bb-4255-8caf-4136c566a962";

function req(body: unknown, init: { origin?: string | null; method?: string; ip?: string; raw?: string; token?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-real-ip": init.ip ?? "1.1.1.1" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  const method = init.method ?? "POST";
  return new Request("http://localhost:3000/api/coach", {
    method,
    headers,
    body: method === "GET" ? undefined : (init.raw ?? JSON.stringify(body)),
  });
}

const turnBody = { action: "session.turn", sid: SID, topic: "t", stage: "표면", history: [], message: "안녕" };
const scoreBody = { action: "score", sid: SID, kind: "diagnostic", text: "내 생각" };
const scoreOut = { consistency: 15, evidence: 20, defense: 15, rationale: "r" };

function fakeQuota(result: QuotaResult) {
  const consume = vi.fn(async () => result);
  return { quota: { consume } as QuotaStore, consume };
}
const OK_QUOTA: QuotaResult = { ok: true, userId: "u1" };
const OK: QuotaStore = { consume: async () => OK_QUOTA };
const AUTH = { token: "t" };

type Msg = { stop_reason?: string; parsed_output?: unknown; usage?: { output_tokens: number } };
function fakeClient(result: Msg | Error) {
  const parse = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return { stop_reason: "end_turn", ...result };
  });
  return { client: { beta: { messages: { parse } }, messages: { parse } } as unknown as LlmClient, parse };
}

beforeEach(() => {
  resetRateLimit();
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("schemas", () => {
  it("accepts valid and rejects oversize, unknown keys, bad action", () => {
    expect(requestSchema.safeParse(turnBody).success).toBe(true);
    expect(requestSchema.safeParse({ ...turnBody, message: "x".repeat(1001) }).success).toBe(false);
    expect(requestSchema.safeParse({ ...turnBody, extra: 1 }).success).toBe(false);
    expect(requestSchema.safeParse({ ...turnBody, message: "" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...turnBody, history: Array(17).fill({ role: "user", content: "a" }) }).success).toBe(false);
    expect(requestSchema.safeParse({ action: "nope" }).success).toBe(false);
    expect(requestSchema.safeParse({ action: "argue.turn", sid: SID, topic: "t", position: "agree", round: 4, history: [], message: "m" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...scoreBody, text: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("guard", () => {
  it("rejects missing/foreign origin with 403 code origin", async () => {
    const { client } = fakeClient({ parsed_output: {} });
    expect((await handleCoach(req(scoreBody, { origin: null }), KEY_ENV, { client })).status).toBe(403);
    const res = await handleCoach(req(scoreBody, { origin: "https://evil.example.com" }), KEY_ENV, { client });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("origin");
    expect((await handleCoach(req(scoreBody, { origin: "https://evil.vercel.app" }), KEY_ENV, { client })).status).toBe(403);
  });

  it("allows localhost and ALLOWED_ORIGINS", async () => {
    const { client } = fakeClient({ parsed_output: scoreOut });
    expect((await handleCoach(req(scoreBody, { origin: "http://127.0.0.1:5173" }), KEY_ENV, { client })).status).toBe(200);
    const env = { ...KEY_ENV, ALLOWED_ORIGINS: "https://logos.example.com, other.test" };
    expect((await handleCoach(req(scoreBody, { origin: "https://logos.example.com" }), env, { client })).status).toBe(200);
    expect((await handleCoach(req(scoreBody, { origin: "https://other.test" }), env, { client })).status).toBe(200);
  });

  it("405 for GET", async () => {
    expect((await handleCoach(req(null, { method: "GET" }), KEY_ENV)).status).toBe(405);
  });

  it("400 for bad content type / bad JSON, 413 for large body", async () => {
    const bad = new Request("http://localhost:3000/api/coach", { method: "POST", headers: { origin: ORIGIN, "content-type": "text/plain" }, body: "{}" });
    expect((await handleCoach(bad, KEY_ENV)).status).toBe(400);
    const res = await handleCoach(req(null, { raw: "{nope" }), KEY_ENV);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("bad_request");
    expect((await handleCoach(req(null, { raw: "x".repeat(70 * 1024) }), KEY_ENV)).status).toBe(413);
  });

  it("429 rate after 60 requests per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++) statuses.push((await handleCoach(req({ action: "bad" }), KEY_ENV)).status);
    expect(statuses.slice(0, 60).every((s) => s === 400)).toBe(true);
    expect(statuses[60]).toBe(429);
    expect((await handleCoach(req({ action: "bad" }, { ip: "2.2.2.2" }), KEY_ENV)).status).toBe(400);
  });
});

describe("auth + quota", () => {
  const sessionTurnBody = turnBody;
  const llmOut = { question: "왜요?", stage: "표면", detectedType: "고민형", aporia: false };

  it("guest diagnostic score -> 200 without consuming quota", async () => {
    const { client } = fakeClient({ parsed_output: scoreOut });
    const { quota, consume } = fakeQuota(OK_QUOTA);
    expect((await handleCoach(req(scoreBody), KEY_ENV, { client, quota })).status).toBe(200);
    expect(consume).not.toHaveBeenCalled();
  });

  it("guest diagnostic is limited per IP per day (3)", async () => {
    const { client } = fakeClient({ parsed_output: scoreOut });
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await handleCoach(req(scoreBody), KEY_ENV, { client })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
    expect((await handleCoach(req(scoreBody, { ip: "9.9.9.9" }), KEY_ENV, { client })).status).toBe(200);
  });

  it("guest session.turn and guest score kind=session -> 401 auth, no LLM call", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOut });
    const a = await handleCoach(req(sessionTurnBody), KEY_ENV, { client });
    expect(a.status).toBe(401);
    expect((await a.json()).code).toBe("auth");
    expect((await handleCoach(req({ ...scoreBody, kind: "session" }), KEY_ENV, { client })).status).toBe(401);
    expect(parse).not.toHaveBeenCalled();
  });

  it("authed: consume(kind, sid, action) runs before the LLM call", async () => {
    const order: string[] = [];
    const parse = vi.fn(async () => {
      order.push("llm");
      return { stop_reason: "end_turn", parsed_output: llmOut };
    });
    const client = { beta: { messages: { parse } }, messages: { parse } } as unknown as LlmClient;
    const consume = vi.fn(async () => {
      order.push("consume");
      return OK_QUOTA;
    });
    const res = await handleCoach(req(sessionTurnBody, { token: "jwt-1" }), KEY_ENV, { client, quota: { consume } });
    expect(res.status).toBe(200);
    expect(consume).toHaveBeenCalledWith("jwt-1", "session", SID, "session.turn");
    expect(order).toEqual(["consume", "llm"]);
  });

  it("derives kind from action", async () => {
    const { client } = fakeClient({ parsed_output: scoreOut });
    const { quota, consume } = fakeQuota(OK_QUOTA);
    await handleCoach(req({ ...scoreBody, kind: "argue" }, { token: "t" }), KEY_ENV, { client, quota });
    await handleCoach(req(scoreBody, { token: "t" }), KEY_ENV, { client, quota });
    expect(consume.mock.calls.map((c) => (c as unknown[])[1])).toEqual(["argue", "diagnostic"]);
  });

  it("quota exceeded -> 429 code quota + reason, LLM not called", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOut });
    const { quota } = fakeQuota({ ok: false, reason: "ref_calls" });
    const res = await handleCoach(req(sessionTurnBody, { token: "t" }), KEY_ENV, { client, quota });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "quota", reason: "ref_calls" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("quota backend unavailable -> 503, LLM not called", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOut });
    const { quota } = fakeQuota({ error: "unavailable" });
    const res = await handleCoach(req(sessionTurnBody, { token: "t" }), KEY_ENV, { client, quota });
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("unavailable");
    expect(parse).not.toHaveBeenCalled();
  });

  it("unauthorized token -> 401", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOut });
    const { quota } = fakeQuota({ error: "unauthorized" });
    const res = await handleCoach(req(sessionTurnBody, { token: "bad" }), KEY_ENV, { client, quota });
    expect(res.status).toBe(401);
    expect(parse).not.toHaveBeenCalled();
  });

  it("token present but no quota store configured -> 503", async () => {
    const { client } = fakeClient({ parsed_output: llmOut });
    const res = await handleCoach(req(sessionTurnBody, { token: "t" }), KEY_ENV, { client, quota: null });
    expect(res.status).toBe(503);
  });

  it("oversize token -> 401 without consuming", async () => {
    const { client } = fakeClient({ parsed_output: llmOut });
    const { quota, consume } = fakeQuota(OK_QUOTA);
    const res = await handleCoach(req(sessionTurnBody, { token: "x".repeat(4097) }), KEY_ENV, { client, quota });
    expect(res.status).toBe(401);
    expect(consume).not.toHaveBeenCalled();
  });
});

describe("handler", () => {
  it("503 without API key", async () => {
    const res = await handleCoach(req(scoreBody), {});
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ code: "unavailable", error: "AI 코치가 아직 준비되지 않았어요." });
  });

  it("returns parsed turn with promptVersion", async () => {
    const { client, parse } = fakeClient({ parsed_output: { question: "왜요?", stage: "표면", detectedType: "고민형", aporia: false } });
    const res = await handleCoach(req(turnBody, AUTH), KEY_ENV, { client, quota: OK });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ question: "왜요?", stage: "표면", detectedType: "고민형", aporia: false });
    expect(typeof body.promptVersion).toBe("string");
    const params = (parse.mock.calls[0] as unknown[])[0] as { model: string; output_config: { effort: string } };
    expect(params.model).toBe("claude-sonnet-5-5");
    expect(params.output_config.effort).toBe("low");
  });

  it("clamps stage: no jump >1 ahead, never backwards", async () => {
    const ahead = fakeClient({ parsed_output: { question: "q", stage: "통합", detectedType: null, aporia: false } });
    const r1 = await (await handleCoach(req(turnBody, AUTH), KEY_ENV, { client: ahead.client, quota: OK })).json();
    expect(r1.stage).toBe("도전");
    const back = fakeClient({ parsed_output: { question: "q", stage: "표면", detectedType: null, aporia: false } });
    const r2 = await (await handleCoach(req({ ...turnBody, stage: "핵심" }, AUTH), KEY_ENV, { client: back.client, quota: OK })).json();
    expect(r2.stage).toBe("핵심");
  });

  it("score uses haiku and computes total", async () => {
    const { client, parse } = fakeClient({ parsed_output: { consistency: 30, evidence: 20, defense: 15, rationale: "r" } });
    const body = await (await handleCoach(req(scoreBody), KEY_ENV, { client })).json();
    expect(body.total).toBe(65);
    expect(((parse.mock.calls[0] as unknown[])[0] as { model: string }).model).toBe("claude-haiku-5-5");
  });

  it("does not leak upstream error details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient(new Error("401 invalid x-api-key sk-ant-api03-TESTFAKE"));
    const res = await handleCoach(req(turnBody, AUTH), KEY_ENV, { client, quota: OK });
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("sk-ant");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("sk-ant");
    expect(spy).toHaveBeenCalledWith("[coach]", "session.turn", "Error", undefined);
  });

  it("refusal stop_reason -> generic 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient({ stop_reason: "refusal", parsed_output: null });
    const res = await handleCoach(req(turnBody, AUTH), KEY_ENV, { client, quota: OK });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ code: "upstream", error: "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요." });
  });
});

describe("arena", () => {
  const turn = { action: "arena.turn", sid: SID, topicId: "t2", side: "pro", round: 1, history: [], message: "생산성은 오른다" };
  const judge = {
    action: "arena.judge",
    sid: SID,
    topicId: "t2",
    side: "pro",
    transcript: [
      { role: "user", content: "주 4일제는 집중도를 높입니다." },
      { role: "assistant", content: "하지만 업무량은 그대로입니다." },
    ],
  };
  const judgeOut = (c: number, e: number, d: number, quote = "집중도를 높입니다") => ({
    consistency: c,
    evidence: e,
    defense: d,
    rationale: "r",
    lessons: [
      { quote, lesson: "l1" },
      { quote: "업무량은   그대로입니다", lesson: "l2" },
      { quote: "없는 문장", lesson: "l3" },
    ],
  });

  it("arena.turn returns argument; prompt carries server-side topic text and locale rule", async () => {
    const { client, parse } = fakeClient({ parsed_output: { argument: "반박", targetsClaim: "생산성" } });
    const res = await handleCoach(req({ ...turn, locale: "en" }, AUTH), KEY_ENV, { client, quota: OK });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ argument: "반박", targetsClaim: "생산성" });
    const p = (parse.mock.calls[0] as unknown[])[0] as { system: { text: string }[]; messages: { content: string }[]; max_tokens: number };
    expect(p.system[0].text).toContain("Write every user-facing field in English.");
    expect(p.messages[0].content).toContain("Does a four-day work week raise productivity?");
    expect(p.max_tokens).toBe(1500);
  });

  it("locale ko uses Korean rule and no English rule", async () => {
    const { client, parse } = fakeClient({ parsed_output: { argument: "a", targetsClaim: "b" } });
    await handleCoach(req(turn, AUTH), KEY_ENV, { client, quota: OK });
    const p = (parse.mock.calls[0] as unknown[])[0] as { system: { text: string }[] };
    expect(p.system[0].text).not.toContain("Write every user-facing field in English.");
    expect(p.system[0].text).toContain("한국어");
  });

  it("unknown topicId and non-alternating transcript -> 400", async () => {
    const { client, parse } = fakeClient({ parsed_output: {} });
    const a = await handleCoach(req({ ...turn, topicId: "nope" }, AUTH), KEY_ENV, { client, quota: OK });
    expect(a.status).toBe(400);
    const bad = { ...judge, transcript: [judge.transcript[1], judge.transcript[0]] };
    expect((await handleCoach(req(bad, AUTH), KEY_ENV, { client, quota: OK })).status).toBe(400);
    const same = { ...judge, transcript: [judge.transcript[0], judge.transcript[0]] };
    expect((await handleCoach(req(same, AUTH), KEY_ENV, { client, quota: OK })).status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("verdict thresholds: >=70 win, 45-65 draw, <=40 lose", async () => {
    const verdicts: string[] = [];
    for (const [c, e, d] of [[30, 20, 30], [30, 20, 15], [15, 20, 15], [15, 20, 0], [0, 20, 15], [0, 0, 0]] as const) {
      const { client } = fakeClient({ parsed_output: judgeOut(c, e, d) });
      const body = await (await handleCoach(req(judge, AUTH), KEY_ENV, { client, quota: OK })).json();
      expect(body.total).toBe(c + e + d);
      verdicts.push(body.verdict);
    }
    // totals: 80 win, 65 draw, 50 draw, 35 lose, 35 lose, 0 lose
    expect(verdicts).toEqual(["win", "draw", "draw", "lose", "lose", "lose"]);
  });

  it("blanks lesson quotes that are not whitespace-normalized substrings of the transcript", async () => {
    const { client } = fakeClient({ parsed_output: judgeOut(15, 20, 15) });
    const body = await (await handleCoach(req(judge, AUTH), KEY_ENV, { client, quota: OK })).json();
    expect(body.lessons.map((l: { quote: string }) => l.quote)).toEqual(["집중도를 높입니다", "업무량은   그대로입니다", ""]);
    expect(body.lessons).toHaveLength(3);
    expect(body.promptVersion).toBe("2026-10-13.1");
  });

  it("judge uses haiku with 1800 max_tokens", async () => {
    const { client, parse } = fakeClient({ parsed_output: judgeOut(15, 20, 15) });
    await handleCoach(req(judge, AUTH), KEY_ENV, { client, quota: OK });
    const p = (parse.mock.calls[0] as unknown[])[0] as { model: string; max_tokens: number };
    expect(p.model).toBe("claude-haiku-5-5");
    expect(p.max_tokens).toBe(1800);
  });
});

describe("logging", () => {
  it("logs only action, status marker and output_tokens", async () => {
    const { client } = fakeClient({ parsed_output: scoreOut, usage: { output_tokens: 42 } });
    await handleCoach(req(scoreBody), KEY_ENV, { client });
    expect(console.log).toHaveBeenCalledWith("[coach]", "score", "ok", 42);
  });
});

describe("output caps", () => {
  it("SDK parse is where caps throw; the handler turns it into 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient(new Error("too long"));
    const res = await handleCoach(req(turnBody, AUTH), KEY_ENV, { client, quota: OK });
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("upstream");
  });

  it("output schemas reject over-cap and wrong-count outputs", async () => {
    const s = await import("../schemas");
    expect(s.turnOutputSchema.safeParse({ question: "q".repeat(301), stage: "표면", detectedType: null, aporia: false }).success).toBe(false);
    expect(s.argueOutputSchema.safeParse({ question: "q", targetWeakness: "w".repeat(81) }).success).toBe(false);
    expect(s.scoreOutputSchema.safeParse({ ...scoreOut, rationale: "r".repeat(301) }).success).toBe(false);
    expect(s.arenaTurnOutputSchema.safeParse({ argument: "a".repeat(601), targetsClaim: "t" }).success).toBe(false);
    expect(s.reportOutputSchema.safeParse({ stuckPoints: ["s".repeat(161)], assumptions: ["a"], nextQuestions: ["n"], turningPoint: "" }).success).toBe(false);
    const lesson = { quote: "q", lesson: "l" };
    const base = { consistency: 0, evidence: 0, defense: 0, rationale: "r" };
    expect(s.arenaJudgeOutputSchema.safeParse({ ...base, lessons: [lesson, lesson] }).success).toBe(false);
    expect(s.arenaJudgeOutputSchema.safeParse({ ...base, rationale: "r".repeat(401), lessons: [lesson, lesson, lesson] }).success).toBe(false);
    expect(s.arenaJudgeOutputSchema.safeParse({ ...base, lessons: [lesson, lesson, lesson] }).success).toBe(true);
  });

  it("an over-cap output surfaces as a throwing parse -> 502 through callStructured", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient({ stop_reason: "max_tokens", parsed_output: null });
    expect((await handleCoach(req(turnBody, AUTH), KEY_ENV, { client, quota: OK })).status).toBe(502);
  });
});

describe("stage pacing", () => {
  it("advances at most one stage per turn, following the 2-answer pace", () => {
    expect(paceStage(1)).toBe("표면");
    expect(paceStage(4)).toBe("핵심");
    // model keeps proposing 표면 but 4 answers in: pace pulls it forward by one
    expect(nextStage("표면", "표면", 4, false)).toBe("도전");
    expect(nextStage("도전", "표면", 4, false)).toBe("핵심");
    expect(nextStage("통합", "통합", 9, false)).toBe("통합");
  });
  it("holds the stage on aporia or THINK", () => {
    expect(nextStage("도전", "핵심", 6, true)).toBe("도전");
  });
  it("advances at least one stage on ENOUGH", () => {
    expect(nextStage("표면", "표면", 1, false, "ENOUGH")).toBe("도전");
    expect(nextStage("통합", "통합", 2, false, "ENOUGH")).toBe("통합");
  });
});
