import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCoach, nextStage, paceStage } from "../handler";
import { resetRateLimit } from "../guard";
import { requestSchema } from "../schemas";
import type { LlmClient } from "../anthropic";

const ORIGIN = "http://localhost:3000";
const KEY_ENV = { ANTHROPIC_API_KEY: "test-key" };

function req(body: unknown, init: { origin?: string | null; method?: string; ip?: string; raw?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": init.ip ?? "1.1.1.1" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  const method = init.method ?? "POST";
  return new Request("http://localhost:3000/api/coach", {
    method,
    headers,
    body: method === "GET" ? undefined : (init.raw ?? JSON.stringify(body)),
  });
}

const turnBody = { action: "session.turn", topic: "t", stage: "표면", history: [], message: "안녕" };
const scoreBody = { action: "score", text: "내 생각" };

type Msg = { stop_reason?: string; parsed_output?: unknown };
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
});

describe("schemas", () => {
  it("accepts valid and rejects oversize, unknown keys, bad action", () => {
    expect(requestSchema.safeParse(turnBody).success).toBe(true);
    expect(requestSchema.safeParse({ ...turnBody, message: "x".repeat(1001) }).success).toBe(false);
    expect(requestSchema.safeParse({ ...turnBody, extra: 1 }).success).toBe(false);
    expect(requestSchema.safeParse({ ...turnBody, message: "" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...turnBody, history: Array(17).fill({ role: "user", content: "a" }) }).success).toBe(false);
    expect(requestSchema.safeParse({ action: "nope" }).success).toBe(false);
    expect(requestSchema.safeParse({ action: "argue.turn", topic: "t", position: "agree", round: 4, history: [], message: "m" }).success).toBe(false);
    expect(requestSchema.safeParse({ action: "score", text: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("guard", () => {
  it("rejects missing/foreign origin with 403", async () => {
    const { client } = fakeClient({ parsed_output: {} });
    expect((await handleCoach(req(scoreBody, { origin: null }), KEY_ENV, { client })).status).toBe(403);
    expect((await handleCoach(req(scoreBody, { origin: "https://evil.example.com" }), KEY_ENV, { client })).status).toBe(403);
    expect((await handleCoach(req(scoreBody, { origin: "https://evil.vercel.app" }), KEY_ENV, { client })).status).toBe(403);
  });

  it("allows localhost, preview hosts and ALLOWED_ORIGINS", async () => {
    const { client } = fakeClient({ parsed_output: { consistency: 15, evidence: 20, defense: 15, rationale: "r" } });
    for (const origin of ["http://127.0.0.1:5173", "https://logos-thinking-coach-git-x.vercel.app"]) {
      expect((await handleCoach(req(scoreBody, { origin }), KEY_ENV, { client })).status).toBe(200);
    }
    const env = { ...KEY_ENV, ALLOWED_ORIGINS: "logos.example.com, other.test" };
    expect((await handleCoach(req(scoreBody, { origin: "https://logos.example.com" }), env, { client })).status).toBe(200);
  });

  it("405 for GET", async () => {
    expect((await handleCoach(req(null, { method: "GET" }), KEY_ENV)).status).toBe(405);
  });

  it("400 for bad content type / bad JSON, 413 for large body", async () => {
    const bad = new Request("http://localhost:3000/api/coach", { method: "POST", headers: { origin: ORIGIN, "content-type": "text/plain" }, body: "{}" });
    expect((await handleCoach(bad, KEY_ENV)).status).toBe(400);
    expect((await handleCoach(req(null, { raw: "{nope" }), KEY_ENV)).status).toBe(400);
    expect((await handleCoach(req(null, { raw: "x".repeat(70 * 1024) }), KEY_ENV)).status).toBe(413);
  });

  it("429 after 20 requests per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await handleCoach(req({ action: "bad" }), KEY_ENV)).status);
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    expect(statuses[20]).toBe(429);
    expect((await handleCoach(req({ action: "bad" }, { ip: "2.2.2.2" }), KEY_ENV)).status).toBe(400);
  });
});

describe("handler", () => {
  it("503 without API key", async () => {
    const res = await handleCoach(req(scoreBody), {});
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "AI 코치가 아직 준비되지 않았어요." });
  });

  it("returns parsed turn with promptVersion", async () => {
    const { client, parse } = fakeClient({ parsed_output: { question: "왜요?", stage: "표면", detectedType: "고민형", aporia: false } });
    const res = await handleCoach(req(turnBody), KEY_ENV, { client });
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
    const r1 = await (await handleCoach(req(turnBody), KEY_ENV, { client: ahead.client })).json();
    expect(r1.stage).toBe("도전");
    const back = fakeClient({ parsed_output: { question: "q", stage: "표면", detectedType: null, aporia: false } });
    const r2 = await (await handleCoach(req({ ...turnBody, stage: "핵심" }), KEY_ENV, { client: back.client })).json();
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
    const res = await handleCoach(req(turnBody), KEY_ENV, { client });
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("sk-ant");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("sk-ant");
    expect(spy).toHaveBeenCalledWith("[coach]", "session.turn", "Error", undefined);
  });

  it("refusal stop_reason -> generic 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient({ stop_reason: "refusal", parsed_output: null });
    const res = await handleCoach(req(turnBody), KEY_ENV, { client });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요." });
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
