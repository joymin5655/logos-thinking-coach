// 요청 가드: 메서드·Origin·본문 크기·Content-Type·레이트 리밋.

export const MAX_BODY_BYTES = 64 * 1024;
// 코칭 1세션이 12회 넘게 호출하므로 버스트 상한은 넉넉히 둔다. 실제 비용 한도는 quota가 맡는다.
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_MAP_CAP = 5000;

export type GuardFailure = { status: number; code: string; error: string };

type Env = Record<string, string | undefined>;

function originOf(value: string | null): URL | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

// 허용 목록은 origin(스킴+호스트+포트) 정확 일치로 비교한다. 스킴 없는 항목은 https로 본다.
function allowedOrigins(env: Env): Set<string> {
  const set = new Set<string>();
  const add = (v: string | undefined) => {
    const t = v?.trim();
    if (!t) return;
    const u = originOf(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (u) set.add(u.origin);
  };
  (env.ALLOWED_ORIGINS ?? "").split(",").forEach(add);
  add(env.VERCEL_PROJECT_PRODUCTION_URL);
  add(env.VERCEL_URL);
  add(env.VERCEL_BRANCH_URL);
  return set;
}

export function isAllowedOrigin(request: Request, env: Env): boolean {
  // Origin이 없으면 Referer로 판정하고, 둘 다 없으면 거부한다.
  const u = originOf(request.headers.get("origin")) ?? originOf(request.headers.get("referer"));
  if (!u) return false;
  // localhost는 로컬 개발(VERCEL_ENV 없음)에서만 허용한다.
  if (!env.VERCEL_ENV && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
  return allowedOrigins(env).has(u.origin);
}

// 인스턴스 메모리 기반 best-effort 제한 — 서버리스 인스턴스마다 따로 세고 콜드스타트 때 초기화된다.
// 일일 한도는 로그인 사용자에게는 consume_quota가 맡고, 여기는 버스트와 비회원 진단만 막는다.
// ponytail: upgrade — Vercel Firewall rate-limit 규칙 또는 Upstash Redis(@upstash/ratelimit).
interface Bucket {
  count: number;
  resetAt: number;
}
const hits = new Map<string, Bucket>();
const guestHits = new Map<string, Bucket>();

export function resetRateLimit(): void {
  hits.clear();
  guestHits.clear();
}

/** 가득 차면 만료분을 정리하고, 그래도 가득이면 삽입 순서상 오래된 10%를 축출한다(진행 중 카운터는 유지). */
function makeRoom(map: Map<string, Bucket>, now: number, cap: number): void {
  if (map.size < cap) return;
  map.forEach((v, k) => {
    if (v.resetAt <= now) map.delete(k);
  });
  if (map.size < cap) return;
  const drop = Math.max(1, Math.ceil(map.size * 0.1));
  Array.from(map.keys())
    .slice(0, drop)
    .forEach((k) => map.delete(k));
}

function bump(map: Map<string, Bucket>, key: string, limit: number, windowMs: number, now: number, cap: number): boolean {
  const cur = map.get(key);
  if (!cur || cur.resetAt <= now) {
    map.delete(key); // 삽입 순서를 갱신해 만료 후 재진입한 키가 새 항목으로 취급되게 한다
    makeRoom(map, now, cap);
    map.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  cur.count += 1;
  return cur.count > limit;
}

/** IPv6는 /64 접두(앞 4그룹)로 묶는다. IPv4 매핑 주소는 IPv4로 본다. */
export function normalizeIp(raw: string): string {
  let ip = raw.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  if (!ip) return "unknown";
  if (!ip.includes(":")) return ip;
  const mapped = /^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped) return mapped[1];
  const [head, tail] = ip.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail !== undefined && tail ? tail.split(":") : [];
  const fill = tail === undefined ? 0 : Math.max(0, 8 - headGroups.length - tailGroups.length);
  const groups = [...headGroups, ...Array(fill).fill("0"), ...tailGroups];
  if (groups.length < 4) return ip;
  return groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip");
  if (real?.trim()) return normalizeIp(real);
  const xff = request.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0];
  return first?.trim() ? normalizeIp(first) : "unknown";
}

export function rateLimited(ip: string, now = Date.now()): boolean {
  return bump(hits, ip, RATE_LIMIT, RATE_WINDOW_MS, now, RATE_MAP_CAP);
}

/** 비회원 진단 일일 버킷. limit을 넘기면 true. */
export function guestLimited(ip: string, limit: number, now = Date.now()): boolean {
  return bump(guestHits, ip, limit, GUEST_WINDOW_MS, now, RATE_MAP_CAP);
}

// 헤더 단계 검사. 본문은 readBody에서 따로 제한한다.
export function checkRequest(request: Request, env: Env): GuardFailure | null {
  if (request.method !== "POST") return { status: 405, code: "bad_request", error: "허용되지 않는 요청이에요." };
  if (!isAllowedOrigin(request, env)) return { status: 403, code: "origin", error: "허용되지 않은 출처예요." };
  if (rateLimited(clientIp(request))) return { status: 429, code: "rate", error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." };
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("application/json")) return { status: 400, code: "bad_request", error: "요청 형식이 올바르지 않아요." };
  const len = Number(request.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) return { status: 413, code: "bad_request", error: "요청이 너무 커요." };
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
      return { status: 413, code: "bad_request", error: "요청이 너무 커요." };
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
