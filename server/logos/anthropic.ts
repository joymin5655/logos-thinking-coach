import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const COACH_MODEL = "claude-sonnet-5-5"; // session.turn, argue.turn, session.report
export const SCORE_MODEL = "claude-haiku-5-5"; // score

export type LlmClient = Pick<Anthropic, "beta" | "messages">;

/** 모델 응답을 쓸 수 없을 때(거절·잘림·파싱 실패). 메시지에는 업스트림 내용을 담지 않는다. */
export class CoachError extends Error {}

export function createClient(env: Record<string, string | undefined>): LlmClient | null {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey, timeout: 25_000, maxRetries: 1 });
}

interface CallOptions<S extends z.ZodType> {
  model: string;
  system: string;
  user: string;
  schema: S;
  effort: "low" | "medium";
  maxTokens: number;
  /** 사용량 로깅용(출력 토큰 수만 전달한다) */
  onUsage?: (outputTokens: number) => void;
}

export async function callStructured<S extends z.ZodType>(
  client: LlmClient,
  { model, system, user, schema, effort, maxTokens, onUsage }: CallOptions<S>,
): Promise<z.infer<S>> {
  // system은 고정 텍스트로 두고 가변 값(단계·anchor)은 user에 넣어 캐시가 유지되게 한다.
  const common = {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: user }],
    output_config: { effort, format: zodOutputFormat(schema) },
  };

  // Sonnet은 정책 거절 시 서버 측 폴백(beta)을 켠다. Haiku(채점)는 일반 경로.
  const message =
    model === COACH_MODEL
      ? await client.beta.messages.parse({
          ...common,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        })
      : await client.messages.parse(common);

  const out = (message as { usage?: { output_tokens?: unknown } }).usage?.output_tokens;
  if (typeof out === "number") onUsage?.(out);
  if (message.stop_reason === "refusal") throw new CoachError("refusal");
  if (message.stop_reason === "max_tokens") throw new CoachError("max_tokens");
  const parsed = message.parsed_output;
  if (parsed == null) throw new CoachError("unparsed");
  return parsed as z.infer<S>;
}
