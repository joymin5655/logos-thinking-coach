import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EVENT_NAMES, MAX_BATCH, MAX_PROPS_BYTES } from "../events";

const sql = readFileSync(join(__dirname, "..", "..", "supabase", "migrations", "20261020000100_events.sql"), "utf8");

describe("events whitelist", () => {
  it("마이그레이션의 화이트리스트가 EVENT_NAMES와 같다", () => {
    const fn = sql.match(/create function private\.event_name_ok[\s\S]*?array\[([\s\S]*?)\]/);
    expect(fn).not.toBeNull();
    const names = [...fn![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect([...names].sort()).toEqual([...EVENT_NAMES].sort());
    expect(new Set(names).size).toBe(names.length);
  });

  it("events.name CHECK가 그 함수를 쓴다", () => {
    expect(sql).toMatch(/name text not null check \(private\.event_name_ok\(name\)\)/);
  });

  it("한도 상수가 마이그레이션과 같다", () => {
    expect(sql).toContain(`t.ord <= ${MAX_BATCH}`);
    expect(sql).toContain(`octet_length(props::text) <= ${MAX_PROPS_BYTES}`);
    expect(sql).toContain(`octet_length(x.props::text) <= ${MAX_PROPS_BYTES}`);
  });
});
