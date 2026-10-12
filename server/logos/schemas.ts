import { z } from "zod";
import { STAGES } from "./prompts.js";

const stage = z.enum(STAGES);
const topic = z.string().max(200);
const text1000 = z.string().max(1000);

const turnItem = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: text1000,
});

const sessionTurn = z.strictObject({
  action: z.literal("session.turn"),
  topic,
  stage,
  history: z.array(turnItem).max(16),
  message: text1000.min(1),
  control: z.enum(["DEEPEN", "ENOUGH", "THINK"]).optional(),
  anchor: text1000.optional(),
});

const sessionReport = z.strictObject({
  action: z.literal("session.report"),
  topic,
  history: z.array(turnItem).max(24),
});

const argueTurn = z.strictObject({
  action: z.literal("argue.turn"),
  topic,
  position: z.enum(["agree", "disagree", "conditional"]),
  round: z.number().int().min(1).max(3),
  history: z.array(turnItem).max(8),
  message: text1000.min(1),
});

const score = z.strictObject({
  action: z.literal("score"),
  text: z.string().min(1).max(2000),
  context: z.string().max(200).optional(),
});

export const requestSchema = z.discriminatedUnion("action", [
  sessionTurn,
  sessionReport,
  argueTurn,
  score,
]);

export type CoachRequest = z.infer<typeof requestSchema>;
export type TurnItem = z.infer<typeof turnItem>;

// 모델 출력 스키마 (structured outputs). 서버가 다시 검증한다.
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

export const scoreOutputSchema = z.object({
  consistency: z.union([z.literal(0), z.literal(15), z.literal(30)]),
  evidence: z.union([z.literal(0), z.literal(20), z.literal(40)]),
  defense: z.union([z.literal(0), z.literal(15), z.literal(30)]),
  rationale: z.string(),
});

export const reportOutputSchema = z.object({
  stuckPoints: z.array(z.string()).min(1).max(3),
  assumptions: z.array(z.string()).min(1).max(3),
  nextQuestions: z.array(z.string()).min(1).max(3),
  turningPoint: z.string(),
});
