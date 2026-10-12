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

// 모델 출력 스키마 (structured outputs). SDK가 parse 단계에서 원본 zod로 다시 검증하므로
// .max()는 서버 측 길이 검사 역할을 한다(위반 → throw → 502).
export const turnOutputSchema = z.object({
  question: z.string().max(300),
  stage,
  detectedType: z.enum(["고민형", "지적형", "검증형"]).nullable(),
  aporia: z.boolean(),
});

export const argueOutputSchema = z.object({
  question: z.string().max(300),
  targetWeakness: z.string().max(80),
});

const rubric = {
  consistency: z.union([z.literal(0), z.literal(15), z.literal(30)]),
  evidence: z.union([z.literal(0), z.literal(20), z.literal(40)]),
  defense: z.union([z.literal(0), z.literal(15), z.literal(30)]),
};

export const scoreOutputSchema = z.object({
  ...rubric,
  rationale: z.string().max(300),
});

export const reportOutputSchema = z.object({
  stuckPoints: z.array(z.string().max(160)).min(1).max(3),
  assumptions: z.array(z.string().max(160)).min(1).max(3),
  nextQuestions: z.array(z.string().max(160)).min(1).max(3),
  turningPoint: z.string().max(200),
});

export const arenaTurnOutputSchema = z.object({
  argument: z.string().max(600),
  targetsClaim: z.string().max(120),
});

export const arenaJudgeOutputSchema = z.object({
  ...rubric,
  rationale: z.string().max(400),
  lessons: z
    .array(z.object({ quote: z.string().max(160), lesson: z.string().max(160) }))
    .length(3),
});
