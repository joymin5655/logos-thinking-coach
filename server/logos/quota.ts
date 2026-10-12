// 인증 + 한도: Supabase consume_quota RPC를 사용자 JWT로 호출한다. PostgREST가 서명·만료를 검증하므로
// 서버에 JWT 시크릿이나 service key가 필요 없다(publishable 키는 공개 값).
import { DAILY_CALL_CEILING, QUOTAS, type QuotaKind } from "../../shared/quotas.js";

export type QuotaResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "day" | "refs" | "ref_calls" }
  | { error: "unauthorized" | "unavailable" };

export interface QuotaStore {
  consume(jwt: string, kind: QuotaKind, ref: string, action: string): Promise<QuotaResult>;
}

const TIMEOUT_MS = 5000;
const REASONS = new Set(["day", "refs", "ref_calls"]);

export function createQuotaStore(
  env: Record<string, string | undefined>,
  fetchImpl: typeof fetch = fetch,
): QuotaStore | null {
  const url = env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return {
    async consume(jwt, kind, ref, action) {
      const limits = QUOTAS[kind];
      let res: Response;
      try {
        res = await fetchImpl(`${url}/rest/v1/rpc/consume_quota`, {
          method: "POST",
          headers: { apikey: key, authorization: `Bearer ${jwt}`, "content-type": "application/json" },
          body: JSON.stringify({
            p_kind: kind,
            p_ref: ref,
            p_action: action,
            p_max_refs: limits.perDay,
            p_calls_per_ref: limits.callsPerSession,
            p_day_ceiling: DAILY_CALL_CEILING,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        return { error: "unavailable" };
      }
      if (res.status === 401 || res.status === 403) return { error: "unauthorized" };
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        return { error: "unavailable" };
      }
      const b = (body ?? {}) as { ok?: unknown; reason?: unknown; user_id?: unknown; code?: unknown };
      if (!res.ok) {
        // 28000 = auth.uid() null, 23503 = 삭제된 계정의 FK 위반
        return b.code === "28000" || b.code === "23503" ? { error: "unauthorized" } : { error: "unavailable" };
      }
      if (b.ok === true && typeof b.user_id === "string") return { ok: true, userId: b.user_id };
      if (b.ok === false && typeof b.reason === "string" && REASONS.has(b.reason)) {
        return { ok: false, reason: b.reason as "day" | "refs" | "ref_calls" };
      }
      return { error: "unavailable" };
    },
  };
}
