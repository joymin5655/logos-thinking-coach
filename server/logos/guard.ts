// 요청 가드: 메서드·Origin·본문 크기·Content-Type·레이트 리밋.

export const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAP_CAP = 5000;

export type GuardFailure = { status: number; error: string };

function hostsOf(value: string | null): { host: string; hostname: string } | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { host: u.host.toLowerCase(), hostname: u.hostname.toLowerCase() };
  } catch {
    return null;
  }
}

export function isAllowedOrigin(request: Request, extra: string | undefined): boolean {
  // Origin이 없으면 Referer로 판정하고, 둘 다 없으면 거부한다.
  const parsed = hostsOf(request.headers.get("origin")) ?? hostsOf(request.headers.get("referer"));
  if (!parsed) return false;
  const { host, hostname } = parsed;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".vercel.app") && hostname.startsWith("logos-thinking-coach")) return true;
  const allowed = (extra ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => hostsOf(s)?.host ?? s);
  return allowed.includes(host) || allowed.includes(hostname);
}

// ponytail: 인스턴스 메모리 기반 best-effort 제한 — 서버리스 인스턴스마다 따로 세고 콜드스타트 때 초기화된다.
// upgrade: Vercel Firewall rate-limit 규칙 또는 Upstash Redis(@upstash/ratelimit).
const hits = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimit(): void {
  hits.clear();
}

export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimited(ip: string, now = Date.now()): boolean {
  if (hits.size >= RATE_MAP_CAP) {
    hits.forEach((v, k) => {
      if (v.resetAt <= now) hits.delete(k);
    });
    if (hits.size >= RATE_MAP_CAP) hits.clear();
  }
  const cur = hits.get(ip);
  if (!cur || cur.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > RATE_LIMIT;
}

// 헤더 단계 검사. 본문은 readBody에서 따로 제한한다.
export function checkRequest(request: Request, env: Record<string, string | undefined>): GuardFailure | null {
  if (request.method !== "POST") return { status: 405, error: "허용되지 않는 요청이에요." };
  if (!isAllowedOrigin(request, env.ALLOWED_ORIGINS)) return { status: 403, error: "허용되지 않은 출처예요." };
  if (rateLimited(clientIp(request))) return { status: 429, error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." };
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("application/json")) return { status: 400, error: "요청 형식이 올바르지 않아요." };
  const len = Number(request.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) return { status: 413, error: "요청이 너무 커요." };
  return null;
}

export async function readBody(request: Request): Promise<string | GuardFailure> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return { status: 413, error: "요청이 너무 커요." };
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(buf);
}
