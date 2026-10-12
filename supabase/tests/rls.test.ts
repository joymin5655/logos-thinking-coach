import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addUser, as, createDb, kstNoon, reset, uid } from "./helpers";

let db: PGlite;
const A = uid(1);
const B = uid(2);
const ADMIN = uid(9);
const REF = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const rec = (id: number, kind = "session") =>
  [REF(id), kind, "2026-10-01T00:00:00Z", JSON.stringify({ x: 1 })] as const;
const insertRec = `insert into records (id, kind, started_at, data) values ($1, $2, $3, $4)`;

beforeAll(async () => {
  db = await createDb();
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await reset(db);
  await addUser(db, 1);
  await addUser(db, 2);
});

describe("records RLS", () => {
  it("본인 행만 읽고 쓴다", async () => {
    await as(db, A).q(insertRec, [...rec(1)]);
    await as(db, B).q(insertRec, [...rec(2)]);
    const rows = await as(db, A).q<{ id: string }>("select id from records");
    expect(rows.map((r) => r.id)).toEqual([REF(1)]);
  });

  it("user_id 기본값은 auth.uid()", async () => {
    await as(db, A).q(insertRec, [...rec(1)]);
    const { rows } = await db.query<{ user_id: string }>("select user_id from records");
    expect(rows[0].user_id).toBe(A);
  });

  it("타인 명의로 insert 불가", async () => {
    await expect(
      as(db, A).q("insert into records (id, user_id, kind, started_at, data) values ($1, $2, 'session', now(), '{}')", [REF(1), B]),
    ).rejects.toThrow(/row-level security/);
  });

  it("타인 행 update/delete는 0행", async () => {
    await as(db, B).q(insertRec, [...rec(2)]);
    expect(await as(db, A).q("update records set verdict = 'win' where id = $1 returning id", [REF(2)])).toHaveLength(0);
    expect(await as(db, A).q("delete from records where id = $1 returning id", [REF(2)])).toHaveLength(0);
    const { rows } = await db.query("select 1 from records where id = $1 and verdict is null", [REF(2)]);
    expect(rows).toHaveLength(1);
  });

  it("update로 소유자를 바꿀 수 없다(with check)", async () => {
    await as(db, A).q(insertRec, [...rec(1)]);
    await expect(as(db, A).q("update records set user_id = $1", [B])).rejects.toThrow(/row-level security/);
  });

  it("제약: 점수 범위, 종류, 본문 크기", async () => {
    await expect(as(db, A).q("insert into records (id, kind, started_at, score_after, data) values ($1,'session',now(),101,'{}')", [REF(1)])).rejects.toThrow(/check/);
    await expect(as(db, A).q("insert into records (id, kind, started_at, data) values ($1,'nope',now(),'{}')", [REF(1)])).rejects.toThrow(/check/);
    const big = JSON.stringify({ s: "가".repeat(300_000) });
    await expect(as(db, A).q(insertRec, [REF(1), "session", "2026-10-01T00:00:00Z", big])).rejects.toThrow(/check/);
  });

  it("updated_at 트리거", async () => {
    await as(db, A).q(insertRec, [...rec(1)]);
    await db.query("update records set updated_at = '2020-01-01'");
    await as(db, A).q("update records set verdict = 'win'");
    const { rows } = await db.query<{ ok: boolean }>("select updated_at > '2025-01-01' as ok from records");
    expect(rows[0].ok).toBe(true);
  });

  it("anon은 모든 테이블에서 permission denied", async () => {
    for (const t of ["records", "usage_events", "waitlist"]) {
      await expect(as(db, "anon").q(`select * from ${t}`)).rejects.toThrow(/permission denied/);
    }
    await expect(as(db, "anon").q(insertRec, [...rec(1)])).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("select * from private.admins")).rejects.toThrow(/permission denied/);
  });
});

describe("usage_events", () => {
  const ins = "insert into usage_events (kind, ref, action) values ('session', $1, 'turn')";

  it("본인 행만 보이고 insert 가능", async () => {
    await as(db, A).q(ins, [REF(1)]);
    await as(db, B).q(ins, [REF(2)]);
    expect(await as(db, A).q("select 1 from usage_events")).toHaveLength(1);
  });

  it("owner도 update/delete 불가", async () => {
    await as(db, A).q(ins, [REF(1)]);
    await expect(as(db, A).q("update usage_events set action = 'x'")).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("delete from usage_events")).rejects.toThrow(/permission denied/);
  });

  it("오래된/미래 created_at insert 거부", async () => {
    await expect(
      as(db, A).q("insert into usage_events (kind, ref, action, created_at) values ('session', $1, 'turn', now() - interval '1 day')", [REF(1)]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(db, A).q("insert into usage_events (kind, ref, action, created_at) values ('session', $1, 'turn', now() + interval '1 day')", [REF(1)]),
    ).rejects.toThrow(/row-level security/);
  });

  it("타인 명의 insert 거부", async () => {
    await expect(
      as(db, A).q("insert into usage_events (user_id, kind, ref, action) values ($1, 'session', $2, 'turn')", [B, REF(1)]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("consume_quota", () => {
  const call = (who: string, kind: string, ref: string, max = 2, per = 3, day = 100) =>
    as(db, who).q<{ consume_quota: { ok: boolean; reason?: string; remaining?: Record<string, number> } }>(
      "select consume_quota($1, $2, 'turn', $3, $4, $5)",
      [kind, ref, max, per, day],
    ).then((r) => r[0].consume_quota);

  it("성공 시 남은 수 반환", async () => {
    const r = await call(A, "session", REF(1));
    expect(r.ok).toBe(true);
    expect(r.remaining).toEqual({ day: 99, refs: 1, ref_calls: 2 });
  });

  it("ref당 호출 한도", async () => {
    for (let i = 0; i < 3; i++) expect((await call(A, "session", REF(1))).ok).toBe(true);
    expect(await call(A, "session", REF(1))).toEqual({ ok: false, reason: "ref_calls" });
  });

  it("하루 ref 수 한도(새 ref만 막고 기존 ref는 계속)", async () => {
    await call(A, "session", REF(1));
    await call(A, "session", REF(2));
    expect(await call(A, "session", REF(3))).toEqual({ ok: false, reason: "refs" });
    expect((await call(A, "session", REF(1))).ok).toBe(true);
    // 다른 kind는 영향 없음
    expect((await call(A, "argue", REF(4))).ok).toBe(true);
  });

  it("일 총량 상한", async () => {
    await call(A, "session", REF(1), 9, 9, 2);
    await call(A, "argue", REF(2), 9, 9, 2);
    expect(await call(A, "arena", REF(3), 9, 9, 2)).toEqual({ ok: false, reason: "day" });
  });

  it("다른 사용자와 독립", async () => {
    await call(A, "session", REF(1), 1, 1, 1);
    expect((await call(B, "session", REF(1), 1, 1, 1)).ok).toBe(true);
  });

  it("어제(한국 시간) 기록은 세지 않는다", async () => {
    await db.query(`insert into usage_events (user_id, kind, ref, action, created_at) values ($1,'session',$2,'turn',${kstNoon(1)})`, [A, REF(1)]);
    const r = await call(A, "session", REF(1), 1, 1, 1);
    expect(r.ok).toBe(true);
  });

  it("anon/uid 없음은 거부", async () => {
    await expect(as(db, "anon").q("select consume_quota('session', $1, 'turn', 1, 1, 1)", [REF(1)])).rejects.toThrow(/permission denied/);
    // authenticated 역할이지만 sub가 없는 토큰
    await expect(
      db.transaction(async (tx) => {
        await tx.query("set local role authenticated");
        await tx.query("select set_config('request.jwt.claims', '{}', true)");
        await tx.query("select consume_quota('session', $1, 'turn', 1, 1, 1)", [REF(1)]);
      }),
    ).rejects.toMatchObject({ code: "28000" });
  });
});

describe("waitlist", () => {
  it("본인 것만 보이고 중복은 unique 위반", async () => {
    await as(db, A).q("insert into waitlist (plan) values ('pro')");
    await as(db, B).q("insert into waitlist (plan) values ('team')");
    expect(await as(db, A).q("select plan from waitlist")).toEqual([{ plan: "pro" }]);
    await expect(as(db, A).q("insert into waitlist (plan) values ('pro')")).rejects.toMatchObject({ code: "23505" });
    await expect(as(db, A).q("insert into waitlist (plan) values ('free')")).rejects.toThrow(/check/);
  });

  it("본인 것만 삭제, update 불가", async () => {
    await as(db, B).q("insert into waitlist (plan) values ('team')");
    expect(await as(db, A).q("delete from waitlist returning plan")).toHaveLength(0);
    await expect(as(db, A).q("update waitlist set plan = 'pro'")).rejects.toThrow(/permission denied/);
  });
});

describe("admin functions", () => {
  beforeEach(async () => {
    await addUser(db, 9, "admin@example.test");
    await db.query("insert into private.admins (user_id) values ($1)", [ADMIN]);
  });

  it("비관리자는 거부, anon은 실행 권한 없음", async () => {
    for (const fn of ["admin_metrics()", "admin_export()", "admin_waitlist()"]) {
      await expect(as(db, A).q(`select * from ${fn}`)).rejects.toMatchObject({ code: "42501" });
      await expect(as(db, "anon").q(`select * from ${fn}`)).rejects.toThrow(/permission denied/);
    }
    expect(await as(db, A).q("select is_admin() as a")).toEqual([{ a: false }]);
    expect(await as(db, ADMIN).q("select is_admin() as a")).toEqual([{ a: true }]);
  });

  async function seed() {
    // A: 3일 전 시작·완료(Δ+20), 2일 전 재방문 → D1 returned. 설문 4/3.
    // B: 3일 전 시작만(미완료), 재방문 없음. C: 오늘 시작 → D1 대상 아님. 관리자 행은 제외되어야 함.
    await addUser(db, 3);
    await db.query(
      `insert into records (id, user_id, kind, started_at, completed_at, score_before, score_after, survey_diff, survey_self, data) values
       ($1,$2,'session',${kstNoon(3)},${kstNoon(3)},40,60,4,3,'{}'),
       ($3,$2,'session',${kstNoon(2)},null,null,null,null,null,'{}'),
       ($4,$5,'session',${kstNoon(3)},null,null,null,null,null,'{}'),
       ($6,$7,'arena',now(),now(),null,null,null,null,'{}'),
       ($8,$9,'session',${kstNoon(5)},${kstNoon(5)},0,100,5,5,'{}')`,
      [REF(1), A, REF(2), REF(3), B, REF(4), uid(3), REF(5), ADMIN],
    );
    await db.query("update records set verdict = 'win' where id = $1", [REF(4)]);
    await db.query("insert into waitlist (user_id, plan) values ($1,'pro'),($2,'pro'),($3,'team')", [A, B, ADMIN]);
  }

  it("지표: 완주율·Δ·D1/D7·설문·아레나·사전 신청, 관리자 행 제외", async () => {
    await seed();
    const [{ m }] = await as(db, ADMIN).q<{ m: any }>("select admin_metrics() as m");
    expect(m.users).toBe(3);
    expect(m.kinds.session).toMatchObject({ started: 3, completed: 1, completion_rate: 0.3333, avg_delta: 20, n_delta: 1 });
    expect(m.kinds.arena).toMatchObject({ started: 1, completed: 1 });
    expect(m.kinds.argue).toMatchObject({ started: 0, completion_rate: null, avg_delta: null });
    // A,B 첫날=3일 전(대상), C 첫날=오늘(대상 아님). A만 +1일에 활동.
    expect(m.d1).toEqual({ eligible: 2, returned: 1, rate: 0.5 });
    expect(m.d7).toEqual({ eligible: 0, returned: 0, rate: null });
    expect(m.survey).toEqual({ diff: 4, self: 3, n: 1 });
    expect(m.arena).toEqual({ win: 1, draw: 0, lose: 0 });
    expect(m.diagnostics).toEqual({ users_with_2plus: 0, avg_change: null });
    expect(m.waitlist).toEqual({ pro: 2 });
  });

  it("재진단 변화(첫→최근)", async () => {
    await db.query(
      `insert into records (id, user_id, kind, started_at, score_after, data) values
       ($1,$2,'diagnostic',${kstNoon(30)},50,'{}'),($3,$2,'diagnostic',${kstNoon(1)},65,'{}'),
       ($4,$5,'diagnostic',${kstNoon(1)},70,'{}')`,
      [REF(1), A, REF(2), REF(3), B],
    );
    const [{ m }] = await as(db, ADMIN).q<{ m: any }>("select admin_metrics() as m");
    expect(m.diagnostics).toEqual({ users_with_2plus: 1, avg_change: 15 });
  });

  it("export: 본문 없이 익명 user_ref만", async () => {
    await seed();
    const rows = await as(db, ADMIN).q<Record<string, unknown>>("select * from admin_export()");
    expect(rows).toHaveLength(4); // 관리자 행 제외
    expect(Object.keys(rows[0])).not.toContain("data");
    expect(Object.keys(rows[0])).not.toContain("user_id");
    const { rows: md5 } = await db.query<{ r: string }>("select substr(md5($1::text),1,12) as r", [A]);
    expect(rows.some((r) => r.user_ref === md5[0].r)).toBe(true);
  });

  it("waitlist: 이메일 포함, 관리자만", async () => {
    await seed();
    const rows = await as(db, ADMIN).q<{ email: string; plan: string }>("select * from admin_waitlist()");
    expect(rows.map((r) => r.email).sort()).toEqual(["admin@example.test", "u1@example.test", "u2@example.test"]);
  });
});

describe("데이터·계정 삭제", () => {
  async function seedBoth() {
    for (const [u, n] of [[A, 1], [B, 2]] as const) {
      await as(db, u).q(insertRec, [...rec(n)]);
      await as(db, u).q("insert into waitlist (plan) values ('pro')");
      await as(db, u).q("insert into usage_events (kind, ref, action) values ('session', $1, 'turn')", [REF(n)]);
    }
  }
  const count = async (t: string, u: string) =>
    Number((await db.query<{ c: number }>(`select count(*)::int as c from ${t} where user_id = $1`, [u])).rows[0].c);

  it("delete_my_data: 본인 기록·신청만 삭제", async () => {
    await seedBoth();
    await as(db, A).q("select delete_my_data()");
    expect(await count("records", A)).toBe(0);
    expect(await count("waitlist", A)).toBe(0);
    expect(await count("usage_events", A)).toBe(1); // 한도 원장은 보존
    expect(await count("records", B)).toBe(1);
    expect(await count("waitlist", B)).toBe(1);
  });

  it("delete_my_account: auth.users와 cascade 정리", async () => {
    await seedBoth();
    await as(db, A).q("select delete_my_account()");
    for (const t of ["records", "waitlist", "usage_events"]) expect(await count(t, A)).toBe(0);
    const { rows } = await db.query("select 1 from auth.users where id = $1", [A]);
    expect(rows).toHaveLength(0);
    expect(await count("records", B)).toBe(1);
  });

  it("anon은 삭제 함수 실행 불가", async () => {
    await expect(as(db, "anon").q("select delete_my_account()")).rejects.toThrow(/permission denied/);
    await expect(as(db, "anon").q("select delete_my_data()")).rejects.toThrow(/permission denied/);
  });
});
