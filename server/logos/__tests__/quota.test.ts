import { describe, expect, it, vi } from "vitest";
import { createQuotaStore } from "../quota";
import { DAILY_CALL_CEILING, QUOTAS } from "../../../shared/quotas";

const ENV = { VITE_SUPABASE_URL: "https://proj.supabase.co/", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" };
const REF = "3b241101-e2bb-4255-8caf-4136c566a962";

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

const consume = (f: typeof fetch) => createQuotaStore(ENV, f)!.consume("jwt", "arena", REF, "arena.turn");

describe("createQuotaStore", () => {
  it("returns null without URL or key", () => {
    expect(createQuotaStore({})).toBeNull();
    expect(createQuotaStore({ VITE_SUPABASE_URL: "https://x.supabase.co" })).toBeNull();
    expect(createQuotaStore({ VITE_SUPABASE_PUBLISHABLE_KEY: "k" })).toBeNull();
  });

  it("calls the RPC with user JWT, publishable key and limits from shared/quotas", async () => {
    const f = respond(200, { ok: true, user_id: "u1" });
    expect(await consume(f as unknown as typeof fetch)).toEqual({ ok: true, userId: "u1" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/rest/v1/rpc/consume_quota");
    const h = init.headers as Record<string, string>;
    expect(h.apikey).toBe("sb_publishable_x");
    expect(h.authorization).toBe("Bearer jwt");
    expect(JSON.parse(init.body as string)).toEqual({
      p_kind: "arena",
      p_ref: REF,
      p_action: "arena.turn",
      p_max_refs: QUOTAS.arena.perDay,
      p_calls_per_ref: QUOTAS.arena.callsPerSession,
      p_day_ceiling: DAILY_CALL_CEILING,
    });
  });

  it("maps ok:false reasons to quota", async () => {
    for (const reason of ["day", "refs", "ref_calls"] as const) {
      expect(await consume(respond(200, { ok: false, reason }) as unknown as typeof fetch)).toEqual({ ok: false, reason });
    }
  });

  it("maps 401/403 and PostgREST 28000/23503 to unauthorized", async () => {
    expect(await consume(respond(401, { message: "JWT expired" }) as unknown as typeof fetch)).toEqual({ error: "unauthorized" });
    expect(await consume(respond(403, {}) as unknown as typeof fetch)).toEqual({ error: "unauthorized" });
    expect(await consume(respond(400, { code: "28000" }) as unknown as typeof fetch)).toEqual({ error: "unauthorized" });
    expect(await consume(respond(409, { code: "23503" }) as unknown as typeof fetch)).toEqual({ error: "unauthorized" });
  });

  it("maps 5xx, network errors, timeouts, bad bodies and other 4xx to unavailable", async () => {
    expect(await consume(respond(500, {}) as unknown as typeof fetch)).toEqual({ error: "unavailable" });
    expect(await consume(respond(503, {}) as unknown as typeof fetch)).toEqual({ error: "unavailable" });
    expect(await consume((async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch)).toEqual({ error: "unavailable" });
    expect(await consume(respond(200, { weird: true }) as unknown as typeof fetch)).toEqual({ error: "unavailable" });
    expect(await consume(respond(404, { code: "PGRST202" }) as unknown as typeof fetch)).toEqual({ error: "unavailable" });
    expect(await consume((async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch)).toEqual({ error: "unavailable" });
  });
});
