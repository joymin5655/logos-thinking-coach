/*
 * authorship.ts — "이 결론은 누가 썼나". 최종 정리 글이 코치 발화와 얼마나 겹치는지 센다. 순수 함수.
 * 한국어는 공백 기준 어절 단위로 비교한다(형태소 분석 없음 — 조사까지 같은 어절만 일치로 본다).
 */
import type { SessionRecord } from './store';

export type Authorship = {
  /** '?'(또는 '？')가 든 코치 발화 수. 세션의 고정 첫 질문(앱이 넣는 문구)은 코치가 만든 것이 아니라 뺀다. */
  coachQuestions: number;
  /** 질문 표시가 없는 코치 발화 수 */
  coachAnswers: number;
  /** 최종 정리 글자 수(공백 제외) */
  userChars: number;
  /** 최종 정리의 어절 4-gram 중 코치 발화에도 나온 비율 (0~1). 정리가 없거나 4어절 미만이면 0. */
  overlap: number;
  /** 겹침을 잴 수 있는 최종 정리(4어절 이상)가 있고 겹치는 4-gram이 하나도 없다 */
  allYours: boolean;
};

const QUESTION = /[?？]/;
const NGRAM = 4;

const words = (s: string) => s.normalize('NFC').split(/\s+/).filter(Boolean);

function grams(w: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + NGRAM <= w.length; i++) out.push(w.slice(i, i + NGRAM).join(' '));
  return out;
}

export function authorship(record: SessionRecord): Authorship {
  const coachTurns = record.turns.filter((t) => t.role === 'assistant');
  // 코칭 세션은 첫 턴이 앱의 고정 질문이다(ThinkingSession). 논증은 첫 턴부터 코치가 만든다.
  const generated = record.kind === 'session' && record.turns[0]?.role === 'assistant' ? coachTurns.slice(1) : coachTurns;
  const coachQuestions = generated.filter((t) => QUESTION.test(t.content)).length;
  const coachAnswers = generated.length - coachQuestions;

  const final = (record.finalSummary ?? '').trim();
  const userChars = final.replace(/\s+/g, '').length;

  const finalGrams = grams(words(final));
  let overlap = 0;
  if (finalGrams.length) {
    // 발화별로 따로 모아 4-gram이 두 발화에 걸치지 않게 한다
    const coach = new Set<string>();
    for (const t of coachTurns) for (const g of grams(words(t.content))) coach.add(g);
    overlap = finalGrams.filter((g) => coach.has(g)).length / finalGrams.length;
  }
  return { coachQuestions, coachAnswers, userChars, overlap, allYours: finalGrams.length > 0 && overlap === 0 };
}
