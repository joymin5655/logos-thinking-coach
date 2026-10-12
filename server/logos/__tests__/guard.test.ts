import { beforeEach, describe, expect, it } from "vitest";
import { clientIp, guestLimited, isAllowedOrigin, normalizeIp, rateLimited, resetRateLimit } from "../guard";

const reqWith = (headers: Record<string, string>) => new Request("http://x/api/coach", { method: "POST", headers });
const withOrigin = (origin: string) => reqWith({ origin });

beforeEach(() => resetRateLimit());

describe("isAllowedOrigin", () => {
  const prod = { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "logos.vercel.app", VERCEL_URL: "logos-abc123.vercel.app" };

  it("production: exact match on the Vercel URLs, no localhost", () => {
    expect(isAllowedOrigin(withOrigin("https://logos.vercel.app"), prod)).toBe(true);
    expect(isAllowedOrigin(withOrigin("https://logos-abc123.vercel.app"), prod)).toBe(true);
    expect(isAllowedOrigin(withOrigin("http://localhost:3000"), prod)).toBe(false);
    expect(isAllowedOrigin(withOrigin("http://127.0.0.1:3000"), prod)).toBe(false);
  });

  it("preview: branch URL allowed, other preview hosts rejected", () => {
    const env = { VERCEL_ENV: "preview", VERCEL_URL: "logos-1.vercel.app", VERCEL_BRANCH_URL: "logos-git-feat.vercel.app" };
    expect(isAllowedOrigin(withOrigin("https://logos-git-feat.vercel.app"), env)).toBe(true);
    expect(isAllowedOrigin(withOrigin("https://logos-2.vercel.app"), env)).toBe(false);
    expect(isAllowedOrigin(withOrigin("http://localhost:3000"), env)).toBe(false);
  });

  it("VERCEL_ENV unset: localhost/127.0.0.1 on any port", () => {
    expect(isAllowedOrigin(withOrigin("http://localhost:5173"), {})).toBe(true);
    expect(isAllowedOrigin(withOrigin("http://127.0.0.1:3000"), {})).toBe(true);
  });

  it("rejects startsWith/suffix tricks and scheme/port mismatches", () => {
    expect(isAllowedOrigin(withOrigin("https://logos.vercel.app.evil.com"), prod)).toBe(false);
    expect(isAllowedOrigin(withOrigin("https://evil-logos.vercel.app"), prod)).toBe(false);
    expect(isAllowedOrigin(withOrigin("http://logos.vercel.app"), prod)).toBe(false);
    expect(isAllowedOrigin(withOrigin("https://logos.vercel.app:8443"), prod)).toBe(false);
    expect(isAllowedOrigin(withOrigin("http://localhost.evil.com"), {})).toBe(false);
  });

  it("ALLOWED_ORIGINS: comma list, scheme optional (https)", () => {
    const env = { ALLOWED_ORIGINS: "https://a.example.com, b.example.com" };
    expect(isAllowedOrigin(withOrigin("https://a.example.com"), env)).toBe(true);
    expect(isAllowedOrigin(withOrigin("https://b.example.com"), env)).toBe(true);
    expect(isAllowedOrigin(withOrigin("https://c.example.com"), env)).toBe(false);
  });

  it("falls back to Referer, rejects when both missing", () => {
    expect(isAllowedOrigin(reqWith({ referer: "http://localhost:3000/x" }), {})).toBe(true);
    expect(isAllowedOrigin(reqWith({}), {})).toBe(false);
  });
});

describe("client ip", () => {
  it("prefers x-real-ip, else first x-forwarded-for", () => {
    expect(clientIp(reqWith({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
    expect(clientIp(reqWith({ "x-forwarded-for": "5.6.7.8, 9.9.9.9" }))).toBe("5.6.7.8");
    expect(clientIp(reqWith({}))).toBe("unknown");
  });

  it("groups IPv6 by /64, maps IPv4-mapped to IPv4", () => {
    const a = normalizeIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    const b = normalizeIp("2001:0db8:0001:0002:1111:2222:3333:4444");
    expect(a).toBe(b);
    expect(normalizeIp("2001:db8:1:3::1")).not.toBe(a);
    expect(normalizeIp("2001:db8::1")).toBe(normalizeIp("2001:db8:0:0:5::9"));
    expect(normalizeIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(normalizeIp("1.2.3.4")).toBe("1.2.3.4");
  });
});

describe("rate map eviction", () => {
  it("at the cap it evicts the oldest 10% and keeps existing counters", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5000; i++) rateLimited(`ip${i}`, now);
    // ip4999 is the newest; give it a counter of 2 so an accidental clear() would reset it
    rateLimited("ip4999", now);
    rateLimited("new-ip", now); // triggers eviction
    // survivors keep counting: 58 more hits on ip4999 -> 60 total allowed, 61st limited
    let limited = false;
    for (let i = 0; i < 58; i++) limited = rateLimited("ip4999", now);
    expect(limited).toBe(false); // 2 + 58 = 60
    expect(rateLimited("ip4999", now)).toBe(true);
    // oldest were evicted: ip0 starts fresh (not limited, count restarts)
    expect(rateLimited("ip0", now)).toBe(false);
  });

  it("prunes expired entries first", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5000; i++) rateLimited(`ip${i}`, t0);
    rateLimited("fresh", t0 + 11 * 60 * 1000); // all expired -> pruned, not evicted-by-age
    expect(rateLimited("fresh", t0 + 11 * 60 * 1000)).toBe(false);
  });

  it("guest bucket counts per day per key", () => {
    expect([1, 2, 3, 4].map(() => guestLimited("g", 3, 5))).toEqual([false, false, false, true]);
    expect(guestLimited("g", 3, 5 + 25 * 60 * 60 * 1000)).toBe(false);
  });
});
