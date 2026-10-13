import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addUser, as, createDb, reset, uid } from "./helpers";

let db: PGlite;
const A = uid(1);
const B = uid(2);
const ADMIN = uid(9);
const ANON = "20000000-0000-4000-8000-000000000001";
const ANON2 = "20000000-0000-4000-8000-000000000002";
const REF = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const track = (who: string, anon: string, events: unknown) =>
  as(db, who).q<{ track: number }>("select track($1, $2::jsonb) as track", [anon, JSON.stringify(events)]).then((r) => r[0].track);
const count = async (where = "true") => Number((await db.query<{ c: string }>(`select count(*) as c from events where ${where}`)).rows[0].c);

beforeAll(async () => {
  db = await createDb();
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await reset(db);
  await db.exec("delete from events; delete from private.cohorts;");
  await addUser(db, 1);
  await addUser(db, 2);
  await addUser(db, 9, "admin@example.test");
  await db.query("insert into private.admins (user_id) values ($1)", [ADMIN]);
});

describe("track", () => {
  it("anon은 track을 부를 수 있지만 events를 읽지 못한다", async () => {
    expect(await track("anon", ANON, [{ name: "landing_view", props: { v: 1 }, path: "/" }])).toBe(1);
    await expect(as(db, "anon").q("select * from events")).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("select * from events")).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("insert into events (anon_id, name) values ($1, 'signup')", [ANON])).rejects.toThrow(/permission denied/);
    const { rows } = await db.query<{ user_id: string | null }>("select user_id from events");
    expect(rows[0].user_id).toBeNull();
  });

  it("로그인 사용자의 이벤트에는 user_id가 붙는다", async () => {
    await track(A, ANON, [{ name: "app_open" }]);
    const { rows } = await db.query<{ user_id: string }>("select user_id from events");
    expect(rows[0].user_id).toBe(A);
  });

  it("화이트리스트·크기·경로·중첩 props 위반은 조용히 버린다", async () => {
    const n = await track("anon", ANON, [
      { name: "landing_view" },
      { name: "not_an_event" },
      { name: "signup", props: { big: "x".repeat(600) } },
      { name: "signup", props: { nested: { a: 1 } } },
      { name: "signup", props: { arr: [1] } },
      { name: "signup", path: "/" + "p".repeat(64) },
      "string",
      { props: { a: 1 } },
      { name: "signup", props: { ok: true, k: "short", n: 3 }, path: "/p".padEnd(64, "p") },
    ]);
    expect(n).toBe(2);
    expect(await count()).toBe(2);
  });

  it("문자열 props 값은 32자까지만 허용한다(자유 텍스트 차단)", async () => {
    const n = await track("anon", ANON, [
      { name: "signup", props: { k: "x".repeat(33) } },
      { name: "signup", props: { ok: "y", k: "x".repeat(33) } },
      { name: "signup", props: { k: "x".repeat(32) } },
      { name: "signup", props: { k: "가".repeat(32) } },
    ]);
    expect(n).toBe(2);
  });

  it("한 번에 25건까지, 배열이 아니면 0", async () => {
    const many = Array.from({ length: 40 }, () => ({ name: "app_open" }));
    expect(await track("anon", ANON, many)).toBe(25);
    expect(await track("anon", ANON, { name: "app_open" })).toBe(0);
    expect(await as(db, "anon").q("select track(null, '[]'::jsonb) as t")).toEqual([{ t: 0 }]);
  });

  it("anon별 24시간 300건 상한(다른 anon은 영향 없음)", async () => {
    await db.query(
      "insert into events (anon_id, name, created_at) select $1, 'app_open', now() - interval '2 hours' from generate_series(1, 298)",
      [ANON],
    );
    expect(await track("anon", ANON, [{ name: "app_open" }, { name: "app_open" }, { name: "app_open" }])).toBe(2);
    expect(await track("anon", ANON, [{ name: "app_open" }])).toBe(0);
    expect(await track("anon", ANON2, [{ name: "app_open" }])).toBe(1);
    // 24시간이 지난 건은 세지 않는다
    await db.query("update events set created_at = now() - interval '2 days' where anon_id = $1", [ANON]);
    expect(await track("anon", ANON, [{ name: "app_open" }])).toBe(1);
  });

  it("anon별 분당 30건 상한", async () => {
    const ten = Array.from({ length: 10 }, () => ({ name: "app_open" }));
    expect(await track("anon", ANON, ten)).toBe(10);
    expect(await track("anon", ANON, ten)).toBe(10);
    expect(await track("anon", ANON, [...ten, ...ten])).toBe(10);
    expect(await track("anon", ANON, ten)).toBe(0);
    expect(await track("anon", ANON2, ten)).toBe(10);
    // 1분이 지나면 다시 받는다
    await db.query("update events set created_at = now() - interval '2 minutes' where anon_id = $1", [ANON]);
    expect(await track("anon", ANON, ten)).toBe(10);
  });

  it("전역 분당 600건 상한", async () => {
    await db.query("insert into events (anon_id, name) select gen_random_uuid(), 'app_open' from generate_series(1, 599)");
    expect(await track("anon", ANON, [{ name: "app_open" }, { name: "app_open" }])).toBe(1);
    expect(await track("anon", ANON, [{ name: "app_open" }])).toBe(0);
  });

  it("전역 24시간 20000건 상한", async () => {
    await db.query(
      "insert into events (anon_id, name, created_at) select gen_random_uuid(), 'app_open', now() - interval '2 hours' from generate_series(1, 19999)",
    );
    expect(await track("anon", ANON, [{ name: "app_open" }, { name: "app_open" }])).toBe(1);
    expect(await track("anon", ANON, [{ name: "app_open" }])).toBe(0);
  });

  it("호출 중 가끔 180일 지난 이벤트를 2000건씩 정리한다", async () => {
    await db.query("insert into events (anon_id, name, created_at) select gen_random_uuid(), 'app_open', now() - interval '200 days' from generate_series(1, 2500)");
    await db.query("insert into events (anon_id, name) values ($1, 'app_open')", [ANON2]);
    await db.query("select setseed(0.42)"); // 난수를 고정해 결정적으로 만든다
    const old = () => count("created_at < now() - interval '180 days'");
    let calls = 0;
    while ((await old()) === 2500 && calls < 1000) {
      await track("anon", ANON, []);
      calls++;
    }
    expect(await old()).toBe(500);
    expect(await count("created_at >= now() - interval '1 day'")).toBe(1);
  });

  it("claim 뒤에 늦게 커밋된 익명 이벤트는 로그인 상태의 다음 track 호출에서 내 계정에 연결된다", async () => {
    await as(db, A).q("select claim_profile($1, '{}')", [ANON]);
    await track("anon", ANON, [{ name: "landing_view" }]); // claim 이후 도착한 익명 이벤트
    await db.query("insert into events (anon_id, name, created_at) values ($1, 'landing_view', now() - interval '31 days')", [ANON]);
    await track("anon", ANON2, [{ name: "landing_view" }]);
    expect(await count("user_id is null")).toBe(3);
    await track(A, ANON, []); // 빈 배치여도 연결한다
    expect(await count(`user_id = '${A}'`)).toBe(1);
    expect(await count("user_id is null")).toBe(2); // 31일 전 것·다른 기기 것은 그대로
    // 다른 계정에 이미 연결된 이벤트는 건드리지 않는다
    await track(B, ANON, [{ name: "app_open" }]);
    expect(await count(`user_id = '${A}'`)).toBe(1);
  });

  it("pg_cron 파기 잡은 확장이 있을 때만 등록한다(없는 환경에서는 마이그레이션이 그대로 통과)", async () => {
    const sql = readFileSync(join(__dirname, "..", "migrations", "20261020000100_events.sql"), "utf8");
    expect(sql).toMatch(/pg_available_extensions where name = 'pg_cron'/);
    expect(sql).toMatch(/cron\.schedule\('logos-purge-events', '17 3 \* \* \*'/);
    expect(sql).toMatch(/jobname = 'logos-purge-events'/);
    expect((await db.query("select 1 from pg_available_extensions where name = 'pg_cron'")).rows).toHaveLength(0); // PGlite에는 없다 → 건너뜀
    expect((await db.query("select 1 from pg_namespace where nspname = 'cron'")).rows).toHaveLength(0);
  });

  it("client_ts는 now() ±1일로 자른다", async () => {
    const year = 365 * 86_400_000;
    await track("anon", ANON, [
      { name: "app_open", ts: Date.now() - year },
      { name: "app_open", ts: Date.now() + year },
      { name: "app_open", ts: Date.now() - 3600_000 },
      { name: "app_open" },
    ]);
    const { rows } = await db.query<{ lo: boolean; hi: boolean; mid: boolean; none: boolean }>(`
      select
        bool_or(client_ts between now() - interval '1 day 1 minute' and now() - interval '23 hours 59 minutes') as lo,
        bool_or(client_ts between now() + interval '23 hours 59 minutes' and now() + interval '1 day 1 minute') as hi,
        bool_or(client_ts between now() - interval '61 minutes' and now() - interval '59 minutes') as mid,
        bool_or(abs(extract(epoch from client_ts - now())) < 5) as none
      from events`);
    expect(rows[0]).toEqual({ lo: true, hi: true, mid: true, none: true });
  });

  it("테이블 CHECK도 직접 막는다(이름·props 크기)", async () => {
    await expect(db.query("insert into events (anon_id, name) values ($1, 'nope')", [ANON])).rejects.toThrow(/check/);
    await expect(db.query("insert into events (anon_id, name, props) values ($1, 'signup', $2)", [ANON, JSON.stringify({ s: "x".repeat(600) })])).rejects.toThrow(/check/);
  });
});

describe("claim_profile", () => {
  const claim = (who: string, anon: string, touch: unknown) =>
    as(db, who).q<{ c: { created: boolean } }>("select claim_profile($1, $2::jsonb) as c", [anon, JSON.stringify(touch)]).then((r) => r[0].c);

  it("first-touch는 처음 한 번만 기록되고 created 플래그가 달라진다", async () => {
    expect(await claim(A, ANON, { source: "kakao", medium: "share", campaign: "oct", ref_host: "example.com" })).toEqual({ created: true });
    expect(await claim(A, ANON, { source: "other", ref_host: "x.com" })).toEqual({ created: false });
    const rows = await as(db, A).q("select first_source, first_medium, first_campaign, first_ref_host from user_meta");
    expect(rows).toEqual([{ first_source: "kakao", first_medium: "share", first_campaign: "oct", first_ref_host: "example.com" }]);
  });

  it("마이그레이션 이전 가입자는 첫 로그인에도 created:false이고 가입 시각은 auth.users 기준이다", async () => {
    await db.query("update auth.users set created_at = now() - interval '40 days' where id = $1", [A]);
    expect(await claim(A, ANON, { source: "kakao" })).toEqual({ created: false });
    const rows = await db.query<{ old: boolean }>("select created_at < now() - interval '39 days' as old from user_meta where user_id = $1", [A]);
    expect(rows.rows).toEqual([{ old: true }]);
    // 오래된 계정은 신규 가입 집계(admin_acquisition)에도 들어가지 않는다
    expect((await as(db, ADMIN).q<{ a: any }>("select admin_acquisition(30) as a"))[0].a.signups).toBe(0);
    // 하루 안에 가입한 계정은 created:true
    expect(await claim(B, ANON2, {})).toEqual({ created: true });
  });

  it("마이그레이션의 backfill 문은 기존 계정의 user_meta를 가입 시각과 함께 채우고 멱등이다", async () => {
    await db.query("update auth.users set created_at = now() - interval '40 days' where id = $1", [A]);
    await claim(B, ANON2, { source: "kakao" });
    const sql = readFileSync(join(__dirname, "..", "migrations", "20261020000100_events.sql"), "utf8").match(/insert into public\.user_meta \(user_id, created_at, claimed_at\)[^;]*;/)![0];
    await db.exec(sql);
    await db.exec(sql);
    const rows = (await db.query<{ user_id: string; old: boolean; src: string | null }>("select user_id, created_at < now() - interval '39 days' as old, first_source as src from user_meta order by user_id")).rows;
    expect(rows.filter((r) => r.user_id !== ADMIN)).toEqual([
      { user_id: A, old: true, src: null },
      { user_id: B, old: false, src: "kakao" },
    ]);
    // backfill 행은 claimed_at이 채워져 있어 이후 첫 claim_profile이 signup을 내지 않는다
    expect(await claim(A, ANON, { source: "late" })).toEqual({ created: false });
    expect((await db.query<{ s: string | null }>("select first_source as s from user_meta where user_id = $1", [A])).rows).toEqual([{ s: null }]);
  });

  it("join_cohort·mark_onboarded가 먼저 행을 만들어도 이후 claim_profile이 first-touch를 채우고 created:true를 낸다", async () => {
    await db.query("insert into private.cohorts (code, arm, consent_version) values ('COH-AAAA', 'A', 'v')");
    await as(db, A).q("select join_cohort('COH-AAAA', 'v')"); // 빈 first_* 행이 먼저 생긴다(claim 실패·지연 상황)
    await as(db, B).q("select mark_onboarded()");
    expect((await db.query<{ c: string | null }>("select claimed_at::text as c from user_meta where user_id = $1", [A])).rows).toEqual([{ c: null }]);
    expect(await claim(A, ANON, { source: "kakao", medium: "share" })).toEqual({ created: true });
    expect(await claim(B, ANON2, { source: "naver" })).toEqual({ created: true });
    const rows = (await db.query("select first_source, first_medium, cohort_code, claimed_at is not null as claimed from user_meta where user_id = $1", [A])).rows;
    expect(rows).toEqual([{ first_source: "kakao", first_medium: "share", cohort_code: "COH-AAAA", claimed: true }]);
    // 이미 채워진 값은 coalesce(기존, 새값)로 유지되고, 두 번째 claim은 created:false
    expect(await claim(A, ANON, { source: "other" })).toEqual({ created: false });
    expect((await db.query("select first_source from user_meta where user_id = $1", [A])).rows).toEqual([{ first_source: "kakao" }]);
    expect((await db.query("select onboarded_at is not null as o, first_source from user_meta where user_id = $1", [B])).rows).toEqual([{ o: true, first_source: "naver" }]);
  });

  it("행이 먼저 만들어졌더라도 오래된 계정은 claim 때 created:false(first-touch는 채운다)", async () => {
    await db.query("update auth.users set created_at = now() - interval '40 days' where id = $1", [A]);
    await as(db, A).q("select mark_onboarded()");
    expect(await claim(A, ANON, { source: "kakao" })).toEqual({ created: false });
    expect((await db.query("select first_source from user_meta where user_id = $1", [A])).rows).toEqual([{ first_source: "kakao" }]);
  });

  it("utm_* 별칭을 받고 64자로 자르며 제어문자를 지운다", async () => {
    await claim(A, ANON, { utm_source: "a\nb" + "z".repeat(100) });
    const rows = await as(db, A).q<{ first_source: string }>("select first_source from user_meta");
    expect(rows[0].first_source).toHaveLength(64);
    expect(rows[0].first_source.startsWith("ab")).toBe(true);
  });

  it("30일 내 익명 이벤트만 내 계정에 연결한다", async () => {
    await track("anon", ANON, [{ name: "landing_view" }, { name: "diagnostic_start" }]);
    await track("anon", ANON2, [{ name: "landing_view" }]);
    await db.query("insert into events (anon_id, name, created_at) values ($1, 'landing_view', now() - interval '31 days')", [ANON]);
    await claim(A, ANON, {});
    expect(await count(`user_id = '${A}'`)).toBe(2);
    expect(await count("user_id is null")).toBe(2);
    // 이미 다른 계정에 연결된 이벤트는 건드리지 않는다
    await claim(B, ANON, {});
    expect(await count(`user_id = '${A}'`)).toBe(2);
  });

  it("직접 쓰기 불가, 비로그인은 거부", async () => {
    await claim(A, ANON, {});
    await expect(as(db, A).q("update user_meta set arm = 'A'")).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("insert into user_meta (user_id) values ($1)", [B])).rejects.toThrow(/permission denied/);
    await expect(as(db, "anon").q("select claim_profile($1, '{}')", [ANON])).rejects.toThrow(/permission denied/);
    await expect(
      db.transaction(async (tx) => {
        await tx.query("set local role authenticated");
        await tx.query("select set_config('request.jwt.claims', '{}', true)");
        await tx.query("select claim_profile($1, '{}')", [ANON]);
      }),
    ).rejects.toMatchObject({ code: "28000" });
  });

  it("user_meta는 본인 것만 보인다", async () => {
    await claim(A, ANON, { source: "a" });
    await claim(B, ANON2, { source: "b" });
    expect(await as(db, A).q("select first_source from user_meta")).toEqual([{ first_source: "a" }]);
  });

  it("arm 컬럼은 authenticated가 읽지 못한다(블라인드), 나머지 컬럼은 읽는다", async () => {
    await claim(A, ANON, {});
    await expect(as(db, A).q("select arm from user_meta")).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("select * from user_meta")).rejects.toThrow(/permission denied/);
    expect(await as(db, A).q("select cohort_code, consent_at from user_meta")).toEqual([{ cohort_code: null, consent_at: null }]);
  });

  it("mark_onboarded는 최초 시각을 유지한다", async () => {
    await as(db, A).q("select mark_onboarded()");
    const first = (await as(db, A).q<{ t: string }>("select onboarded_at::text as t from user_meta"))[0].t;
    await as(db, A).q("select mark_onboarded()");
    expect((await as(db, A).q<{ t: string }>("select onboarded_at::text as t from user_meta"))[0].t).toBe(first);
  });
});

describe("join_cohort", () => {
  const V = "2026-10-pilot-v1";
  const join = (who: string, code: string, v = V) =>
    as(db, who).q<{ j: { cohort_code: string; joined: boolean } }>("select join_cohort($1, $2) as j", [code, v]).then((r) => r[0].j);
  const seed = (code: string, arm: string, extra = "") =>
    db.query(`insert into private.cohorts (code, arm, consent_version${extra ? ", " + extra.split("=")[0] : ""}) values ($1, $2, $3${extra ? ", " + extra.split("=")[1] : ""})`, [code, arm, V]);

  it("코드를 대문자로 정규화해 arm과 동의를 기록한다", async () => {
    await seed("PILOT-A7K2", "A");
    // arm은 반환하지 않고(블라인드), 서버에만 기록한다
    expect(await join(A, " pilot-a7k2 ")).toEqual({ cohort_code: "PILOT-A7K2", joined: true });
    const rows = await as(db, A).q<{ cohort_code: string; consent_version: string; consent: boolean }>(
      "select cohort_code, consent_version, consent_at is not null as consent from user_meta",
    );
    expect(rows).toEqual([{ cohort_code: "PILOT-A7K2", consent_version: V, consent: true }]);
    expect((await db.query<{ arm: string }>("select arm from user_meta where user_id = $1", [A])).rows).toEqual([{ arm: "A" }]);
  });

  it("잘못된·비활성 코드는 invalid_code", async () => {
    await seed("PILOT-A7K2", "A");
    await db.query("insert into private.cohorts (code, arm, active, consent_version) values ('OLD-CODE1', 'B', false, $1)", [V]);
    for (const c of ["NOPE", "x", "bad code!", "", "A".repeat(25), "OLD-CODE1", "PILOT-A"]) {
      await expect(join(A, c)).rejects.toThrow(/invalid_code/);
    }
  });

  it("arm은 바뀌지 않는다(다른 코드는 already_joined, 같은 코드는 멱등)", async () => {
    await seed("PILOT-A7K2", "A");
    await seed("PILOT-B7K2", "B");
    await join(A, "PILOT-A7K2");
    await expect(join(A, "PILOT-B7K2")).rejects.toThrow(/already_joined/);
    expect(await join(A, "PILOT-A7K2")).toEqual({ cohort_code: "PILOT-A7K2", joined: false });
    expect((await db.query<{ arm: string }>("select arm from user_meta where user_id = $1", [A])).rows).toEqual([{ arm: "A" }]);
  });

  it("이미 참가한 사람에게는 다른 코드의 유효 여부가 드러나지 않는다", async () => {
    await seed("PILOT-A7K2", "A");
    await seed("PILOT-B7K2", "B");
    await join(A, "PILOT-A7K2");
    for (const c of ["PILOT-B7K2", "NOPE-NOPE-1", "x", ""]) {
      await expect(join(A, c)).rejects.toThrow(/already_joined/);
    }
  });

  it("동의 버전이 다르면 consent_mismatch이고 아무것도 배정하지 않는다", async () => {
    await seed("PILOT-A7K2", "A");
    await expect(join(A, "PILOT-A7K2", "old-version")).rejects.toThrow(/consent_mismatch/);
    // 실패한 호출은 롤백되어 참가 흔적(user_meta 행)이 남지 않는다
    expect(await as(db, A).q("select cohort_code from user_meta")).toEqual([]);
  });

  it("max_members를 넘으면 full", async () => {
    await seed("SMALL-ONE", "A", "max_members=1");
    await join(A, "SMALL-ONE");
    await expect(join(B, "SMALL-ONE")).rejects.toThrow(/full/);
    expect(await as(db, B).q("select cohort_code from user_meta")).toEqual([]);
  });

  it("동의 철회 후 같은 코드로 다시 동의하면 복원된다", async () => {
    await seed("PILOT-A7K2", "A");
    await join(A, "PILOT-A7K2");
    await as(db, A).q("select withdraw_consent()");
    expect(await as(db, A).q("select cohort_code, consent_at is null as w from user_meta")).toEqual([{ cohort_code: "PILOT-A7K2", w: true }]);
    await join(A, "PILOT-A7K2");
    expect(await as(db, A).q("select consent_at is not null as c from user_meta")).toEqual([{ c: true }]);
  });

  it("재동의하면 consent_version도 현재 버전으로 갱신되고 joined_at은 그대로다", async () => {
    await seed("PILOT-A7K2", "A");
    await join(A, "PILOT-A7K2");
    const first = (await as(db, A).q<{ j: string }>("select joined_at::text as j from user_meta"))[0].j;
    expect(first).not.toBeNull();
    await as(db, A).q("select withdraw_consent()");
    await db.query("update private.cohorts set consent_version = 'v2' where code = 'PILOT-A7K2'");
    await join(A, "PILOT-A7K2", "v2");
    expect(await as(db, A).q("select consent_version, consent_at is not null as c, joined_at::text as j from user_meta")).toEqual([{ consent_version: "v2", c: true, j: first }]);
  });

  it("비로그인·anon 거부", async () => {
    await seed("PILOT-A7K2", "A");
    await expect(as(db, "anon").q("select join_cohort('PILOT-A7K2', $1)", [V])).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("select * from private.cohorts")).rejects.toThrow(/permission denied/);
  });
});

describe("admin KPI RPCs", () => {
  const fns = ["admin_funnel()", "admin_abandon()", "admin_acquisition()", "admin_arms()", "admin_purge_events()", "admin_rater_export()", "admin_rater_key()", "admin_export()"];

  it("비관리자는 42501, anon은 실행 권한 없음", async () => {
    for (const fn of fns) {
      await expect(as(db, A).q(`select * from ${fn}`)).rejects.toMatchObject({ code: "42501" });
      await expect(as(db, "anon").q(`select * from ${fn}`)).rejects.toThrow(/permission denied/);
    }
  });

  it("관리자는 모두 실행되고 관리자 활동은 지표에서 빠진다", async () => {
    await track("anon", ANON, [{ name: "landing_view" }, { name: "diagnostic_start" }, { name: "diagnostic_done", props: { score: 45, guest: true } }]);
    await track(ADMIN, ANON2, [{ name: "landing_view" }]);
    const f = (await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f;
    expect(f.days).toBe(30);
    expect(f.steps.map((s: any) => [s.name, s.persons])).toEqual([
      ["landing_view", 1], ["diagnostic_start", 1], ["diagnostic_done", 1], ["signup", 0], ["session_start", 0], ["session_complete", 0],
    ]);
    expect(f.steps[2].rate_from_landing).toBe(1);
    expect(f.guest_scores).toMatchObject({ n: 1, "40-59": 1, "0-19": 0 });
    expect(f.d1).toMatchObject({ eligible: 0, returned: 0 });

    expect((await as(db, ADMIN).q<{ a: any }>("select admin_abandon() as a"))[0].a).toMatchObject({ incomplete: 0, open_no_record: 0 });
    expect((await as(db, ADMIN).q<{ a: any }>("select admin_acquisition(30) as a"))[0].a).toMatchObject({ signups: 0, by_source: [] });
    const arms = (await as(db, ADMIN).q<{ a: any }>("select admin_arms() as a"))[0].a;
    expect(arms.A).toMatchObject({ n: 0, consented: 0, contaminated: 0 });
    expect(Object.keys(arms)).toEqual(["A", "B"]);
  });

  it("D1 재방문: 어제 처음 온 사람이 오늘 다시 왔는지", async () => {
    await db.query("insert into events (anon_id, name, created_at) values ($1, 'app_open', now() - interval '1 day')", [ANON]);
    await db.query("insert into events (anon_id, name, created_at) values ($1, 'app_open', now())", [ANON]);
    await db.query("insert into events (anon_id, name, created_at) values ($1, 'app_open', now() - interval '1 day')", [ANON2]);
    const f = (await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f;
    expect(f.d1).toMatchObject({ eligible: 2, returned: 1, rate: 0.5 });
  });

  it("D1/D7: 첫 방문일은 기간과 무관하게 전체 이벤트에서 구한다(기간 앞쪽에 걸친 옛 방문자는 코호트가 아니다)", async () => {
    const ev = (anon: string, ago: string) => db.query("insert into events (anon_id, name, created_at) values ($1, 'app_open', now() - $2::interval)", [anon, ago]);
    const OLD = "20000000-0000-4000-8000-000000000003";
    // OLD: 40일 전 처음 와서 어제·오늘도 옴 — 기간(30일) 안 이벤트만 보면 어제가 첫 방문이라 D1 분모에 잘못 들어간다
    await ev(OLD, "40 days"); await ev(OLD, "1 day"); await ev(OLD, "0 days");
    // ANON: 10일 전 첫 방문, 다음 날(D1)·7일째(D7) 재방문
    await ev(ANON, "10 days"); await ev(ANON, "9 days"); await ev(ANON, "3 days");
    // ANON2: 10일 전 첫 방문, 재방문 없음
    await ev(ANON2, "10 days");
    const f = (await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f;
    expect(f.d1).toMatchObject({ eligible: 2, returned: 1, rate: 0.5 });
    expect(f.d7).toMatchObject({ eligible: 2, returned: 1, rate: 0.5 });
    // 기간을 넓히면 OLD도 코호트: D1은 40일 전 → 39일째에 없으므로 미복귀
    const wide = (await as(db, ADMIN).q<{ f: any }>("select admin_funnel(60) as f"))[0].f;
    expect(wide.d1).toMatchObject({ eligible: 3, returned: 1 });
  });

  it("D1: 180일 파기로 옛 이벤트가 사라져도 계정이 있는 사람은 가입일을 하한으로 써서 신규로 재분류되지 않는다", async () => {
    await as(db, A).q("select claim_profile($1, '{}')", [ANON]);
    await db.query("update user_meta set created_at = now() - interval '200 days' where user_id = $1", [A]);
    // 파기 뒤 남은 이벤트: 10일 전·9일 전(옛 방문이 사라져 첫 방문처럼 보인다)
    await db.query("insert into events (anon_id, user_id, name, created_at) values ($1, $2, 'app_open', now() - interval '10 days'), ($1, $2, 'app_open', now() - interval '9 days')", [ANON, A]);
    // 익명 방문자는 보정할 수 없어 같은 상황이면 신규로 센다
    await db.query("insert into events (anon_id, name, created_at) values ($1, 'app_open', now() - interval '10 days'), ($1, 'app_open', now() - interval '9 days')", [ANON2]);
    const f = (await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f;
    expect(f.d1).toMatchObject({ eligible: 1, returned: 1 });
    // 가입이 기간 안이면(10일 전) 신규로 센다
    await db.query("update user_meta set created_at = now() - interval '10 days' where user_id = $1", [A]);
    expect((await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f.d1).toMatchObject({ eligible: 2, returned: 2 });
  });

  it("비회원 점수 분포는 props.guest가 true인 diagnostic_done만 센다(가입 후 user_id가 붙어도 유지)", async () => {
    await track("anon", ANON, [{ name: "diagnostic_done", props: { score: 45, guest: true } }]);
    await track("anon", ANON2, [{ name: "diagnostic_done", props: { score: 85, guest: true } }]);
    await track(A, ANON, [{ name: "diagnostic_done", props: { score: 10, guest: false } }]);
    await track("anon", uid(7), [{ name: "diagnostic_done", props: { score: 20 } }]); // guest 없음 → 제외
    await track("anon", uid(8), [{ name: "diagnostic_done", props: { score: 30, guest: "true" } }]); // 불리언이 아님 → 제외, 오류 없음
    await as(db, A).q("select claim_profile($1, '{}')", [ANON]); // 익명 이벤트가 A에 연결돼도 guest 표식은 그대로
    const f = (await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f;
    expect(f.guest_scores).toMatchObject({ n: 2, "40-59": 1, "80-100": 1, "0-19": 0 });
  });

  it("admin_funnel north_star·d7_session", async () => {
    const ins = `insert into records (id, user_id, kind, started_at, completed_at, data) values ($1, $2, $3, now() - make_interval(days => $4::int), null, $5)`;
    // A: session 3건 중 2건이 정리 작성(하나는 미완료), argue 1건 정리 없음
    await db.query(ins, [REF(1), A, "session", 10, JSON.stringify({ finalSummary: "x" })]);
    await db.query(ins, [REF(2), A, "session", 3, JSON.stringify({ finalSummary: "y" })]);
    await db.query(ins, [REF(3), A, "session", 2, JSON.stringify({})]);
    await db.query(ins, [REF(4), A, "argue", 2, JSON.stringify({})]);
    // 빈 문자열 finalSummary는 정리를 쓴 것으로 세지 않는다(admin_abandon의 판정과 같다)
    await db.query(ins, [REF(8), A, "session", 1, JSON.stringify({ finalSummary: "" })]);
    await db.query(ins, [REF(9), A, "argue", 1, JSON.stringify({ finalSummary: "" })]);
    // 관리자 기록은 제외, 기간 밖(40일 전) 기록은 north_star에서 제외
    await db.query(ins, [REF(5), ADMIN, "session", 1, JSON.stringify({ finalSummary: "z" })]);
    await db.query(ins, [REF(6), B, "session", 40, JSON.stringify({ finalSummary: "old" })]);
    const f = (await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f;
    expect(f.north_star.session).toEqual({ started: 4, summarized: 2, rate: 0.5 });
    expect(f.north_star.argue).toEqual({ started: 2, summarized: 0, rate: 0 });
    // d7: A 첫 시작 10일 전 → 정확히 3일 전에 시작함(7일째) = 복귀. B 첫 시작 40일 전, 47일째 기록 없음 = 미복귀. 관리자 제외.
    expect(f.d7_session).toEqual({ eligible: 2, returned: 1, rate: 0.5 });
    // 7일 미만 신규 사용자는 분모에서 빠진다
    await addUser(db, 3);
    await db.query(ins, [REF(7), uid(3), "argue", 2, JSON.stringify({})]);
    expect((await as(db, ADMIN).q<{ f: any }>("select admin_funnel(30) as f"))[0].f.d7_session.eligible).toBe(2);
  });

  it("admin_abandon: 단계별 이탈, 정리 후 미완료, 첫 답변 전 이탈", async () => {
    const ins = `insert into records (id, user_id, kind, started_at, completed_at, data) values ($1, $2, $3, now() - interval '1 day', $4, $5)`;
    await db.query(ins, [REF(1), A, "session", null, JSON.stringify({ stageReached: "claim" })]);
    await db.query(ins, [REF(2), A, "session", null, JSON.stringify({ stageReached: "claim", finalSummary: "요약" })]);
    await db.query(ins, [REF(3), B, "argue", null, JSON.stringify({ stageReached: "rebuttal" })]);
    await db.query(ins, [REF(4), B, "session", "2026-10-01T00:00:00Z", JSON.stringify({ stageReached: "done", finalSummary: "x" })]);
    await db.query(ins, [REF(5), ADMIN, "session", null, JSON.stringify({ stageReached: "claim" })]);
    // A: session_open 2건 중 하나는 1시간 안에 session 기록이 이어짐
    await db.query("insert into events (anon_id, user_id, name, created_at, client_ts) values ($1, $2, 'session_open', now() - interval '3 days', now() - interval '3 days')", [ANON, A]);
    await db.query("insert into events (anon_id, user_id, name, created_at, client_ts) values ($1, $2, 'session_open', now() - interval '1 day 10 minutes', now() - interval '1 day 10 minutes')", [ANON, A]);
    // 방금 연 것은 아직 판정하지 않는다
    await db.query("insert into events (anon_id, user_id, name) values ($1, $2, 'session_open')", [ANON, A]);
    const a = (await as(db, ADMIN).q<{ a: any }>("select admin_abandon() as a"))[0].a;
    expect(a.incomplete).toBe(3);
    expect(a.by_stage).toEqual({ "session:claim": 2, "argue:rebuttal": 1 });
    expect(a.summary_no_complete).toBe(1);
    expect(a.opens).toBe(2);
    // started_at = now() - 1 day: 첫 open(3일 전)에는 이어진 기록 없음, 둘째(1일 10분 전)는 10분 뒤에 기록 시작
    expect(a.open_no_record).toBe(1);
  });

  it("admin_abandon: 첫 답변 전 이탈은 client_ts로 비교한다(늦게 도착한 이벤트도 같은 기기 시각 기준)", async () => {
    await db.query("insert into records (id, user_id, kind, started_at, data) values ($1, $2, 'session', now() - interval '3 hours', '{}')", [REF(1), A]);
    // 기록 시작 10분 전에 열었지만 서버에는 2시간 뒤에 도착(created_at 기준이면 기록이 open보다 먼저라 이탈로 오판)
    await db.query("insert into events (anon_id, user_id, name, created_at, client_ts) values ($1, $2, 'session_open', now() - interval '1 hour 10 minutes', now() - interval '3 hours 10 minutes')", [ANON, A]);
    const a = (await as(db, ADMIN).q<{ a: any }>("select admin_abandon() as a"))[0].a;
    expect(a.opens).toBe(1);
    expect(a.open_no_record).toBe(0);
  });

  it("admin_abandon: 이어하기(props.resume = true)로 연 session_open은 첫 답변 전 이탈에서 뺀다", async () => {
    const open = (props: unknown) =>
      db.query("insert into events (anon_id, user_id, name, props, created_at, client_ts) values ($1, $2, 'session_open', $3::jsonb, now() - interval '3 hours', now() - interval '3 hours')", [ANON, A, JSON.stringify(props)]);
    await open({ resume: true });
    await open({ resume: false });
    await open({});
    await open({ resume: "true" }); // 불리언이 아니면 이어하기로 보지 않는다(오류 없음)
    const a = (await as(db, ADMIN).q<{ a: any }>("select admin_abandon() as a"))[0].a;
    expect(a.opens).toBe(3);
    expect(a.open_no_record).toBe(3);
  });

  it("admin_abandon: stageReached는 32자로 잘라 집계한다", async () => {
    const ins = `insert into records (id, user_id, kind, started_at, data) values ($1, $2, 'session', now() - interval '1 day', $3)`;
    await db.query(ins, [REF(1), A, JSON.stringify({ stageReached: "x".repeat(200) })]);
    const a = (await as(db, ADMIN).q<{ a: any }>("select admin_abandon() as a"))[0].a;
    expect(Object.keys(a.by_stage)).toEqual(["session:" + "x".repeat(32)]);
  });

  it("admin_acquisition: first_source별 가입·온보딩·완료", async () => {
    await as(db, A).q("select claim_profile($1, $2::jsonb)", [ANON, JSON.stringify({ source: "kakao", ref_host: "t.co" })]);
    await as(db, B).q("select claim_profile($1, '{}')", [ANON2]);
    await as(db, A).q("select mark_onboarded()");
    await db.query("insert into records (id, user_id, kind, started_at, completed_at, data) values ($1, $2, 'session', now(), now(), '{}')", [REF(1), A]);
    const a = (await as(db, ADMIN).q<{ a: any }>("select admin_acquisition(30) as a"))[0].a;
    expect(a.signups).toBe(2);
    expect(a.by_source).toEqual([
      { source: "(direct)", signups: 1, onboarded: 0, completed_any: 0 },
      { source: "kakao", signups: 1, onboarded: 1, completed_any: 1 },
    ]);
    expect(a.by_ref_host).toEqual([{ ref_host: "t.co", signups: 1 }]);
  });

  it("admin_arms: arm별 n·동의·완주율·Δ·재진단·B군 오염", async () => {
    await db.query("insert into private.cohorts (code, arm, consent_version) values ('COH-AAAA', 'A', 'v'), ('COH-BBBB', 'B', 'v')");
    await addUser(db, 3);
    await as(db, A).q("select join_cohort('COH-AAAA', 'v')");
    await as(db, B).q("select join_cohort('COH-BBBB', 'v')");
    await as(db, uid(3)).q("select join_cohort('COH-BBBB', 'v')");
    await as(db, uid(3)).q("select withdraw_consent()");
    await db.query("update user_meta set joined_at = now() - interval '10 days'"); // 아래 기록·이벤트(1~3일 전)는 모두 참가 이후
    const ins = `insert into records (id, user_id, kind, started_at, completed_at, score_before, score_after, survey_diff, data)
                 values ($1, $2, $3, now() - interval '2 days', $4, $5, $6, $7, '{}')`;
    await db.query(ins, [REF(1), A, "session", "2026-10-01T00:00:00Z", 30, 60, 4]);
    await db.query(ins, [REF(2), A, "session", null, null, null, null]);
    await db.query(ins, [REF(3), B, "session", "2026-10-01T00:00:00Z", 30, 40, 2]);
    await db.query(ins, [REF(4), uid(3), "session", "2026-10-01T00:00:00Z", 10, 90, null]);
    await db.query(`insert into records (id, user_id, kind, started_at, completed_at, score_after, data) values ($1, $2, 'diagnostic', now() - interval '3 days', now(), 40, '{}'), ($3, $2, 'diagnostic', now() - interval '1 day', now(), 55, '{}')`, [REF(5), A, REF(6)]);
    const arms = (await as(db, ADMIN).q<{ a: any }>("select admin_arms() as a"))[0].a;
    expect(arms.A).toMatchObject({ n: 1, consented: 1, started: 2, completed: 1, completion_rate: 0.5, avg_delta: 30, n_delta: 1, n_survey: 1, survey_diff: 4, contaminated: 0 });
    expect(arms.A.rediagnostic).toEqual({ n: 1, avg_change: 15 });
    expect(arms.A.d7).toMatchObject({ eligible: 1, returned: 0 });
    // B군: 2명 참가, 1명 철회 → 철회자의 기록은 지표에서 빠진다. 코칭 기록이 있는 동의자 1명 = 오염 1
    expect(arms.B).toMatchObject({ n: 2, consented: 1, started: 1, completed: 1, avg_delta: 10, contaminated: 1 });
  });

  it("admin_arms: 참가(joined_at) 전 기록·이벤트는 군별 지표와 D7 자격에서 제외한다", async () => {
    await db.query("insert into private.cohorts (code, arm, consent_version) values ('COH-AAAA', 'A', 'v')");
    await as(db, A).q("select join_cohort('COH-AAAA', 'v')");
    await db.query("update user_meta set joined_at = now() - interval '8 days'");
    const ins = `insert into records (id, user_id, kind, started_at, completed_at, score_before, score_after, data) values ($1, $2, 'session', now() - make_interval(days => $3::int), $4, 30, 60, '{}')`;
    await db.query(ins, [REF(1), A, 20, "2026-10-01T00:00:00Z"]); // 참가 전
    await db.query(ins, [REF(2), A, 5, null]); // 참가 후
    await db.query("insert into events (anon_id, user_id, name, created_at) values ($1, $2, 'app_open', now() - interval '20 days'), ($1, $2, 'app_open', now() - interval '5 days')", [ANON, A]);
    await db.query("insert into events (anon_id, user_id, name, created_at) values ($1, $2, 'app_open', now() - interval '3 hours')", [ANON, A]);
    const arms = (await as(db, ADMIN).q<{ a: any }>("select admin_arms() as a"))[0].a;
    expect(arms.A).toMatchObject({ n: 1, started: 1, completed: 0, n_delta: 1 });
    // 첫 활동일 = 참가 이후 5일 전 → 7일째는 아직 안 지나 자격 없음(참가 전 20일 전 활동을 기준으로 하면 자격이 생긴다)
    expect(arms.A.d7).toMatchObject({ eligible: 0, returned: 0 });
  });

  it("admin_purge_events: 기간이 지난 이벤트만 지운다", async () => {
    await db.query("insert into events (anon_id, name, created_at) values ($1, 'app_open', now() - interval '200 days'), ($1, 'app_open', now() - interval '10 days')", [ANON]);
    expect(await as(db, ADMIN).q("select admin_purge_events() as n")).toEqual([{ n: 1 }]);
    expect(await count()).toBe(1);
    await expect(as(db, ADMIN).q("select admin_purge_events(0)")).rejects.toMatchObject({ code: "22023" });
  });

  it("admin_export는 기존 컬럼 뒤에 form·arm·first_source를 붙인다", async () => {
    await db.query("insert into private.cohorts (code, arm, consent_version) values ('COH-AAAA', 'A', 'v')");
    await as(db, A).q("select claim_profile($1, $2::jsonb)", [ANON, JSON.stringify({ source: "kakao" })]);
    await as(db, A).q("select join_cohort('COH-AAAA', 'v')");
    await db.query("insert into records (id, user_id, kind, started_at, data) values ($1, $2, 'diagnostic', now(), $3)", [REF(1), A, JSON.stringify({ form: "f2" })]);
    await db.query("insert into records (id, user_id, kind, started_at, data) values ($1, $2, 'session', now(), '{}')", [REF(2), B]);
    // f0~f3가 아닌 form 값은 내보내지 않는다
    await db.query("insert into records (id, user_id, kind, started_at, data) values ($1, $2, 'session', now(), $3)", [REF(3), B, JSON.stringify({ form: "f9-" + "z".repeat(100) })]);
    const r = await as(db, ADMIN).q<Record<string, unknown>>("select * from admin_export()");
    expect(Object.keys(r[0])).toEqual([
      "user_ref", "kind", "started_at", "completed_at", "score_before", "score_after", "survey_diff", "survey_self", "verdict", "prompt_version", "form", "arm", "first_source",
    ]);
    expect(r).toHaveLength(3);
    expect(r.filter((x) => x.kind === "session").map((x) => x.form)).toEqual([null, null]);
    const diag = r.find((x) => x.kind === "diagnostic")!;
    expect(diag).toMatchObject({ form: "f2", arm: "A", first_source: "kakao" });
    expect(r.find((x) => x.kind === "session")).toMatchObject({ form: null, arm: null, first_source: null });
  });
});

describe("rater export", () => {
  beforeEach(async () => {
    await db.query("insert into private.cohorts (code, arm, consent_version) values ('COH-AAAA', 'A', 'v'), ('COH-BBBB', 'B', 'v')");
    await as(db, A).q("select join_cohort('COH-AAAA', 'v')");
    await as(db, B).q("select join_cohort('COH-BBBB', 'v')");
    // 참가 시각을 고정해 두고(실제로는 join 시점) 아래 진단은 모두 참가 이후에 시작한 것으로 한다
    await db.query("update user_meta set joined_at = '2026-09-30T00:00:00Z'");
    const ins = "insert into records (id, user_id, kind, started_at, completed_at, score_after, data) values ($1, $2, 'diagnostic', $3, $3, $4, $5)";
    await db.query(ins, [REF(1), A, "2026-10-01T00:00:00Z", 30, JSON.stringify({ form: "f0", text: "A pre" })]);
    await db.query(ins, [REF(2), A, "2026-10-08T00:00:00Z", 50, JSON.stringify({ form: "f1", text: "A post" })]);
    await db.query(ins, [REF(3), B, "2026-10-02T00:00:00Z", 35, JSON.stringify({ text: "B pre" })]);
    // 참가하지 않은 사용자와 관리자의 진단은 제외
    await db.query(ins, [REF(4), ADMIN, "2026-10-03T00:00:00Z", 10, JSON.stringify({ text: "admin" })]);
  });

  it("blind_id·form·text만 내보내고 user_ref·시각·점수는 없다", async () => {
    const rows = await as(db, ADMIN).q<Record<string, unknown>>("select * from admin_rater_export()");
    expect(Object.keys(rows[0]).sort()).toEqual(["blind_id", "form", "text"]);
    expect(rows.map((r) => r.text).sort()).toEqual(["A post", "A pre", "B pre"]);
    expect(rows.find((r) => r.text === "B pre")!.form).toBeNull();
    expect(rows.find((r) => r.text === "A pre")!.form).toBe("f0");
    // blind_id는 다시 내보내도 같다
    const again = await as(db, ADMIN).q<{ blind_id: string }>("select blind_id from admin_rater_export()");
    expect(again.map((r) => r.blind_id).sort()).toEqual(rows.map((r) => r.blind_id as string).sort());
  });

  it("동의 철회자는 내보내기와 키에서 빠진다", async () => {
    await as(db, ADMIN).q("select * from admin_rater_export()");
    await as(db, B).q("select withdraw_consent()");
    const rows = await as(db, ADMIN).q<{ text: string }>("select text from admin_rater_export()");
    expect(rows.map((r) => r.text).sort()).toEqual(["A post", "A pre"]);
    const key = await as(db, ADMIN).q<{ arm: string }>("select arm from admin_rater_key()");
    expect(key.map((k) => k.arm)).toEqual(["A", "A"]);
  });

  it("참가(joined_at) 전에 시작한 진단은 내보내기·키에서 빠지고 phase도 참가 이후 기준이다", async () => {
    const ins = "insert into records (id, user_id, kind, started_at, completed_at, score_after, data) values ($1, $2, 'diagnostic', $3, $3, $4, $5)";
    await db.query(ins, [REF(10), A, "2026-09-20T00:00:00Z", 20, JSON.stringify({ form: "f2", text: "A before join" })]);
    const rows = await as(db, ADMIN).q<{ blind_id: string; text: string }>("select blind_id, text from admin_rater_export()");
    expect(rows.map((r) => r.text).sort()).toEqual(["A post", "A pre", "B pre"]);
    const key = await as(db, ADMIN).q<{ blind_id: string; phase: string; form: string }>("select blind_id, phase, form from admin_rater_key()");
    expect(key).toHaveLength(3);
    // 참가 전 글은 키도 blind_id도 없고, 참가 후 첫 진단이 pre다
    expect(key.find((k) => k.form === "f0")!.phase).toBe("pre");
    expect(key.find((k) => k.form === "f2")).toBeUndefined();
    expect(Number((await db.query<{ c: string }>("select count(*) as c from private.rater_keys")).rows[0].c)).toBe(3);
    // 재참가(같은 코드)·철회 후 재동의로 joined_at이 바뀌지 않아 범위가 넓어지지 않는다
    await as(db, A).q("select withdraw_consent()");
    await as(db, A).q("select join_cohort('COH-AAAA', 'v')");
    expect((await as(db, ADMIN).q("select * from admin_rater_export()")).map((r: any) => r.text).sort()).toEqual(["A post", "A pre", "B pre"]);
  });

  it("키 파일은 blind_id를 user_ref·arm·phase·form·점수로 되돌린다", async () => {
    const exp = await as(db, ADMIN).q<{ blind_id: string; text: string }>("select blind_id, text from admin_rater_export()");
    const key = await as(db, ADMIN).q<Record<string, unknown>>("select * from admin_rater_key()");
    expect(Object.keys(key[0])).toEqual(["blind_id", "user_ref", "arm", "phase", "form", "score"]);
    const blindOf = (t: string) => exp.find((e) => e.text === t)!.blind_id;
    expect(key.find((k) => k.blind_id === blindOf("A pre"))).toMatchObject({ arm: "A", phase: "pre", form: "f0", score: 30 });
    expect(key.find((k) => k.blind_id === blindOf("A post"))).toMatchObject({ arm: "A", phase: "post", form: "f1", score: 50 });
    expect(key.find((k) => k.blind_id === blindOf("B pre"))).toMatchObject({ arm: "B", phase: "pre", form: null });
    expect(new Set(key.map((k) => k.user_ref)).size).toBe(2);
  });
});

describe("delete_my_data", () => {
  it("events와 user_meta를 포함해 내 것만 지운다", async () => {
    await track(A, ANON, [{ name: "app_open" }]);
    await track(B, ANON2, [{ name: "app_open" }]);
    await track("anon", ANON, [{ name: "landing_view" }]);
    await as(db, A).q("select claim_profile($1, '{}')", [ANON]);
    await as(db, B).q("select claim_profile($1, '{}')", [ANON2]);
    await as(db, A).q("insert into records (id, kind, started_at, data) values ($1, 'session', now(), '{}')", [REF(1)]);
    await as(db, A).q("insert into waitlist (plan) values ('pro')");
    await as(db, A).q("select delete_my_data()");
    expect(await count(`user_id = '${A}'`)).toBe(0);
    expect(await count(`user_id = '${B}'`)).toBe(1);
    expect(await as(db, A).q("select user_id from user_meta")).toHaveLength(0);
    expect(await as(db, B).q("select user_id from user_meta")).toHaveLength(1);
    expect(await as(db, A).q("select * from records")).toHaveLength(0);
    expect(await as(db, A).q("select * from waitlist")).toHaveLength(0);
  });

  it("p_anon을 주면 이 기기의 연결되지 않은 익명 이벤트도 지운다(남의 것은 그대로)", async () => {
    await track("anon", ANON, [{ name: "landing_view" }, { name: "app_open" }]);
    await track("anon", ANON2, [{ name: "landing_view" }]);
    await track(A, ANON, [{ name: "app_open" }]);
    await as(db, A).q("select delete_my_data($1)", [ANON]);
    expect(await count(`anon_id = '${ANON}'`)).toBe(0);
    expect(await count(`anon_id = '${ANON2}'`)).toBe(1);
    // p_anon 없이 부르면 계정에 연결된 것만 지운다
    await track("anon", ANON, [{ name: "landing_view" }]);
    await as(db, A).q("select delete_my_data()");
    expect(await count(`anon_id = '${ANON}'`)).toBe(1);
    // 다른 사용자에게 이미 연결된 익명 이벤트는 p_anon으로도 지우지 못한다
    await track(B, ANON, [{ name: "app_open" }]);
    await as(db, A).q("select delete_my_data($1)", [ANON]);
    expect(await count(`user_id = '${B}'`)).toBe(2); // B의 track이 남아 있던 미연결 이벤트 1건도 B에 이었다(track 뒤 연결)
  });

  it("anon은 실행 불가, 계정 삭제는 events·user_meta를 cascade로 지운다", async () => {
    await expect(as(db, "anon").q("select delete_my_data()")).rejects.toThrow(/permission denied/);
    await track(A, ANON, [{ name: "app_open" }]);
    await as(db, A).q("select claim_profile($1, '{}')", [ANON]);
    await as(db, A).q("select delete_my_account()");
    expect(await count(`user_id = '${A}'`)).toBe(0);
    expect(Number((await db.query<{ c: string }>("select count(*) as c from user_meta")).rows[0].c)).toBe(0);
  });
});

describe("함수 기본 권한(Supabase 재현)", () => {
  it("revoke 없이 만든 public 함수는 anon이 호출할 수 있다 — 모든 RPC에 revoke가 필요한 이유", async () => {
    await db.exec("create function public.zz_unguarded() returns int language sql as $$ select 1 $$");
    try {
      expect(await as(db, "anon").q("select zz_unguarded() as v")).toEqual([{ v: 1 }]);
    } finally {
      await db.exec("drop function public.zz_unguarded()");
    }
  });
});

describe("record_terms_consent", () => {
  const V = "2026-10-14";
  const row = () =>
    as(db, A).q<{ v: string | null; t: string | null }>("select terms_version as v, extract(epoch from terms_agreed_at)::text as t from user_meta");

  it("행이 없으면 만들고 버전·시각을 기록한다", async () => {
    await as(db, A).q("select record_terms_consent($1)", [V]);
    const r = await row();
    expect(r).toHaveLength(1);
    expect(r[0].v).toBe(V);
    expect(r[0].t).not.toBeNull();
  });

  it("같은 버전을 다시 부르면 최초 시각을 유지하고, 다른 버전이면 갱신한다", async () => {
    await as(db, A).q("select record_terms_consent($1)", [V]);
    await db.exec(`update user_meta set terms_agreed_at = '2026-10-14T00:00:00Z' where user_id = '${uid(1)}'`);
    await as(db, A).q("select record_terms_consent($1)", [V]);
    expect(Number((await row())[0].t)).toBe(Date.parse("2026-10-14T00:00:00Z") / 1000);
    await as(db, A).q("select record_terms_consent('2026-11-01')");
    const r = await row();
    expect(r[0].v).toBe("2026-11-01");
    expect(Number(r[0].t)).not.toBe(Date.parse("2026-10-14T00:00:00Z") / 1000);
  });

  it("기존 행의 다른 컬럼(first-touch·참가 정보)을 건드리지 않는다", async () => {
    await db.exec(`insert into user_meta (user_id, first_source, cohort_code) values ('${uid(1)}', 'blog', 'COH-AAAA')`);
    await as(db, A).q("select record_terms_consent($1)", [V]);
    const r = await as(db, A).q<{ s: string; c: string }>("select first_source as s, cohort_code as c from user_meta");
    expect(r[0]).toEqual({ s: "blog", c: "COH-AAAA" });
  });

  it("동의 기록이 claim_profile보다 먼저여도 claim이 first-touch를 채우고 created:true를 내며, created_at은 auth.users.created_at이다", async () => {
    await db.query("update auth.users set created_at = now() - interval '3 days' where id = $1", [A]);
    await as(db, A).q("select record_terms_consent($1)", [V]);
    expect((await db.query<{ c: string | null }>("select claimed_at::text as c from user_meta where user_id = $1", [A])).rows).toEqual([{ c: null }]);
    const r = await as(db, A).q<{ c: { created: boolean } }>("select claim_profile($1, $2::jsonb) as c", [
      "20000000-0000-4000-8000-000000000001",
      JSON.stringify({ source: "kakao" }),
    ]);
    expect(r[0].c).toEqual({ created: false }); // 3일 전 계정은 하루 안 가입이 아니므로 signup을 내지 않는다
    const row = (await db.query("select first_source, terms_version, claimed_at is not null as claimed, created_at = (select created_at from auth.users where id = $1) as same from user_meta where user_id = $1", [A])).rows;
    expect(row).toEqual([{ first_source: "kakao", terms_version: V, claimed: true, same: true }]);
  });

  it("동의 기록이 먼저여도 하루 안에 가입한 계정은 claim_profile이 created:true를 낸다", async () => {
    await as(db, A).q("select record_terms_consent($1)", [V]);
    const r = await as(db, A).q<{ c: { created: boolean } }>("select claim_profile($1, $2::jsonb) as c", [
      "20000000-0000-4000-8000-000000000001",
      JSON.stringify({ source: "kakao" }),
    ]);
    expect(r[0].c).toEqual({ created: true });
    expect((await db.query("select first_source, terms_version from user_meta where user_id = $1", [A])).rows).toEqual([{ first_source: "kakao", terms_version: V }]);
  });

  it("형식이 틀린 버전·null은 거부한다", async () => {
    await expect(as(db, A).q("select record_terms_consent('v1')")).rejects.toThrow(/invalid_version/);
    await expect(as(db, A).q("select record_terms_consent(null)")).rejects.toThrow(/invalid_version/);
  });

  it("anon은 실행할 수 없고, authenticated는 직접 쓸 수 없다", async () => {
    await expect(as(db, "anon").q("select record_terms_consent($1)", [V])).rejects.toThrow(/permission denied/);
    await as(db, A).q("select record_terms_consent($1)", [V]);
    await expect(as(db, A).q("update user_meta set terms_version = 'x'")).rejects.toThrow(/permission denied/);
    await expect(as(db, A).q("insert into user_meta (user_id, terms_version) values ($1, 'x')", [uid(2)])).rejects.toThrow(/permission denied/);
  });

  it("다른 사용자의 기록은 보이지 않고, delete_my_data가 지운다", async () => {
    await as(db, A).q("select record_terms_consent($1)", [V]);
    await as(db, B).q("select record_terms_consent($1)", [V]);
    expect(await row()).toHaveLength(1);
    await as(db, A).q("select delete_my_data()");
    expect(await row()).toHaveLength(0);
    expect(await as(db, B).q("select 1 from user_meta")).toHaveLength(1);
  });
});
