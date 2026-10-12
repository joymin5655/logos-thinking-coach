import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = join(__dirname, "..", "migrations");

// Supabase가 제공하는 최소 환경을 흉내 낸다: roles, auth 스키마, auth.uid()/jwt().
const BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid $$;
  -- 실제 Supabase처럼 auth 스키마 사용 권한과 uid()/jwt() 실행 권한은 두 역할에 열려 있다(users 테이블은 아님).
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
`;

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  return db;
}

export type Identity = string | "anon";

/** 신원을 바꿔 한 문장씩 별도 트랜잭션으로 실행한다(오류 시 롤백). uuid = authenticated, "anon" = anon. */
export function as(db: PGlite, who: Identity) {
  return {
    async q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      return db.transaction(async (tx) => {
        if (who === "anon") {
          await tx.query("set local role anon");
        } else {
          await tx.query("set local role authenticated");
          await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who })]);
        }
        return (await tx.query<T>(sql, params)).rows;
      });
    },
  };
}

export const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** 슈퍼유저로 시드(RLS 우회). */
export async function addUser(db: PGlite, n: number, email = `u${n}@example.test`) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [uid(n), email]);
  return uid(n);
}

export async function reset(db: PGlite) {
  await db.exec("delete from auth.users");
}

/** 한국 시간 기준 n일 전 정오(타임스탬프 SQL 식). */
export const kstNoon = (daysAgo: number) =>
  `((date_trunc('day', now() at time zone 'Asia/Seoul') - interval '${daysAgo} day' + interval '12 hours') at time zone 'Asia/Seoul')`;
