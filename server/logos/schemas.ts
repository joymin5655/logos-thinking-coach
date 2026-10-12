import { z } from "zod";
import { arenaTopic } from "../../shared/arenaTopics.js";
import { STAGES } from "./prompts.js";

const stage = z.enum(STAGES);
const topic = z.string().max(200);
const text1000 = z.string().max(1000);

const turnItem = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: text1000,
});

// 모든 액션 공통: sid는 한도를 세는 단위(세션·판·진단 1건), locale은 AI 출력 언어.
const common = {
  sid: z.uuid(),
  locale: z.enum(["ko", "en"]).optional(),
};

const topicId = z.string().max(40).refine((id) => arenaTopic(id) !== undefined);
const side = z.enum(["pro", "con"]);

const sessionTurn = z.strictObject({
  ...common,
  action: z.literal("session.turn"),
  topic,
  stage,
  history: z.array(turnItem).max(16),
  message: text1000.min(1),
  control: z.enum(["DEEPEN", "ENOUGH", "THINK"]).optional(),
  anchor: text1000.optional(),
});

const sessionReport = z.strictObject({
  ...common,
  action: z.literal("session.report"),
  topic,
  history: z.array(turnItem).max(24),
});

const argueTurn = z.strictObject({
  ...common,
  action: z.literal("argue.turn"),
  topic,
  position: z.enum(["agree", "disagree", "conditional"]),
  round: z.number().int().min(1).max(3),
  history: z.array(turnItem).max(8),
  message: text1000.min(1),
});

const score = z.strictObject({
  ...common,
  action: z.literal("score"),
  kind: z.enum(["diagnostic", "session", "argue"]),
  text: z.string().min(1).max(2000),
  context: z.string().max(200).optional(),
});

const arenaTurn = z.strictObject({
  ...common,
  action: z.literal("arena.turn"),
  topicId,
  side,
  round: z.number().int().min(1).max(3),
  history: z.array(turnItem).max(6),
  message: text1000.min(1),
});

const arenaJudge = z.strictObject({
  ...common,
  action: z.literal("arena.judge"),
  topicId,
  side,
  transcript: z
    .array(turnItem)
    .min(2)
    .max(6)
    .refine((t) => t.every((item, i) => item.role === (i % 2 === 0 ? "user" : "assistant"))),
});

export const requestSchema = z.discriminatedUnion("action", [
  sessionTurn,
  sessionReport,
  argueTurn,
  score,
  arenaTurn,
  arenaJudge,
]);

export type CoachRequest = z.infer<typeof requestSchema>;
export type TurnItem = z.infer<typeof turnItem>;

// 모델 출력 스키마 (structured outputs). 문자열 길이는 스키마로 막지 않는다 — 모델이 설명의 길이
// 힌트를 넘기면 SDK parse가 실패해 사용자에게 502가 가기 때문이다(10-13 실측: 영어 rationale 300자 초과).
// 출력량은 max_tokens로 묶고, 화면 안전 상한은 handler의 clipOutput()이 자른다.
export const turnOutputSchema = z.object({
  question: z.string(),
  stage,
  detectedType: z.enum(["고민형", "지적형", "검증형"]).nullable(),
  aporia: z.boolean(),
});

export const argueOutputSchema = z.object({
  question: z.string(),
  targetWeakness: z.string(),
});

const rubric = {
  consistency: z.union([z.literal(0), z.literal(15), z.literal(30)]),
  evidence: z.union([z.literal(0), z.literal(20), z.literal(40)]),
  defense: z.union([z.literal(0), z.literal(15), z.literal(30)]),
};

export const scoreOutputSchema = z.object({
  ...rubric,
  rationale: z.string(),
});

export const reportOutputSchema = z.object({
  stuckPoints: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).min(1),
  nextQuestions: z.array(z.string()).min(1),
  turningPoint: z.string(),
});

export const arenaTurnOutputSchema = z.object({
  argument: z.string(),
  targetsClaim: z.string(),
});

export const arenaJudgeOutputSchema = z.object({
  ...rubric,
  rationale: z.string(),
  lessons: z.array(z.object({ quote: z.string(), lesson: z.string() })).min(1),
});

/** 필드별 화면 안전 상한(문자 수). 배열 필드는 항목 수 상한도 함께 둔다. */
export const OUTPUT_CAPS = {
  question: 600,
  targetWeakness: 160,
  rationale: 1000,
  stuckPoints: 400,
  assumptions: 400,
  nextQuestions: 400,
  turningPoint: 400,
  argument: 1200,
  targetsClaim: 240,
  quote: 400,
  lesson: 400,
} as const;
export const MAX_LIST_ITEMS = 3;

const clipText = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** 모델 출력의 문자열·배열을 OUTPUT_CAPS 안으로 자른다(얕은 구조 + lessons 한 단계). */
export function clipOutput<T extends Record<string, unknown>>(out: T): T {
  const caps = OUTPUT_CAPS as Record<string, number>;
  const res: Record<string, unknown> = { ...out };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === "string" && caps[k]) res[k] = clipText(v, caps[k]);
    else if (Array.isArray(v)) {
      res[k] = v.slice(0, MAX_LIST_ITEMS).map((item) =>
        typeof item === "string"
          ? caps[k] ? clipText(item, caps[k]) : item
          : item && typeof item === "object"
            ? clipOutput(item as Record<string, unknown>)
            : item,
      );
    }
  }
  return res as T;
}
