import { describe, expect, it } from 'vitest';
import { authorship } from '../authorship';
import type { SessionRecord, Turn } from '../store';

const turn = (role: Turn['role'], content: string): Turn => ({ role, content, at: '2026-10-13T00:00:00.000Z' });
const rec = (kind: SessionRecord['kind'], turns: Turn[], finalSummary?: string): SessionRecord => ({
  id: 'r',
  kind,
  topic: 't',
  startedAt: '2026-10-13T00:00:00.000Z',
  stageReached: '통합',
  turns,
  promptVersion: 'v',
  finalSummary,
});

describe('authorship', () => {
  it('코칭 세션의 고정 첫 질문은 코치 질문에서 뺀다', () => {
    const a = authorship(
      rec('session', [
        turn('assistant', '이 주제에서 지금 가장 확신하는 한 가지는 무엇인가요?'),
        turn('user', '연봉이요'),
        turn('assistant', '연봉이 오르면 만족도도 오른다고 보시나요?'),
        turn('user', '아마도'),
        turn('assistant', '그 가정이 틀릴 수 있는 경우를 떠올려 보세요.'),
      ]),
    );
    expect(a.coachQuestions).toBe(1);
    expect(a.coachAnswers).toBe(1);
  });

  it('논증은 첫 코치 발화부터 센다, 전각 물음표도 질문', () => {
    const a = authorship(rec('argue', [turn('user', '찬성'), turn('assistant', '근거가 뭔가요?'), turn('user', '...'), turn('assistant', '정말 그럴까요？')]));
    expect(a.coachQuestions).toBe(2);
    expect(a.coachAnswers).toBe(0);
  });

  it('겹치는 4어절이 없으면 allYours', () => {
    const a = authorship(
      rec('argue', [turn('user', 'x'), turn('assistant', '연봉이 오르면 정말 만족도도 오르나요?')], '나는 결국 돈보다 일의 의미가 오래 간다고 생각한다.'),
    );
    expect(a.overlap).toBe(0);
    expect(a.allYours).toBe(true);
    expect(a.userChars).toBe('나는결국돈보다일의의미가오래간다고생각한다.'.length);
  });

  it('코치 발화와 4어절이 이어서 겹친 비율을 잰다', () => {
    const coach = turn('assistant', '연봉이 오르면 만족도도 오른다는 가정은 맞나요?');
    // 겹침 없음: 4-gram 3개 모두 코치 발화에 없다
    expect(authorship(rec('argue', [coach], '연봉이 오르면 만족도도 반드시 오르지는 않는다 그래서')).overlap).toBe(0);
    // 어절 6개 → 4-gram 3개 중 앞 2개가 코치 발화에 있다
    const b = authorship(rec('argue', [coach], '연봉이 오르면 만족도도 오른다는 가정은 틀렸다'));
    expect(b.overlap).toBeCloseTo(2 / 3, 5);
    expect(b.allYours).toBe(false);
  });

  it('정리가 없거나 4어절 미만이면 겹침 0이지만 allYours는 아니다', () => {
    expect(authorship(rec('argue', [turn('assistant', '왜요?')])).allYours).toBe(false);
    const short = authorship(rec('argue', [turn('assistant', '왜요?')], '돈이 전부는 아니다'));
    expect(short.overlap).toBe(0);
    expect(short.allYours).toBe(false);
    expect(short.userChars).toBeGreaterThan(0);
  });

  it('발화 경계를 넘는 4-gram은 겹침으로 세지 않는다', () => {
    const a = authorship(rec('argue', [turn('assistant', '하나 둘 셋'), turn('assistant', '넷 다섯 여섯')], '하나 둘 셋 넷'));
    expect(a.overlap).toBe(0);
    expect(a.allYours).toBe(true);
  });
});
