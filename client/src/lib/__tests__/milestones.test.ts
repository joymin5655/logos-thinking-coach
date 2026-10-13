process.env.TZ = 'Asia/Seoul';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEEN_KEY, detectMilestones, keepNew, levelOf, loadSeen, markSeen, nextMilestone } from '../milestones';
import { emptyStore, type ArenaRecord, type DiagnosticRecord, type LogosStore, type Score, type SessionRecord } from '../store';

const sc = (consistency: number, evidence: number, defense: number): Score => ({ consistency, evidence, defense, total: consistency + evidence + defense, rationale: '' });
const done = (id: string, at: string, after: Score, over: Partial<SessionRecord> = {}): SessionRecord => ({
  id,
  kind: 'argue',
  topic: `주제 ${id}`,
  startedAt: at,
  completedAt: at,
  stageReached: '통합',
  turns: [],
  promptVersion: 'v',
  scoreAfter: after,
  ...over,
});
const store = (over: Partial<LogosStore>): LogosStore => ({ ...emptyStore(), ...over });

describe('levelOf', () => {
  it('0 / 중간 / 만점 = L1 / L2 / L3', () => {
    expect([0, 15, 30].map((v) => levelOf('consistency', v))).toEqual([1, 2, 3]);
    expect([0, 20, 40].map((v) => levelOf('evidence', v))).toEqual([1, 2, 3]);
    expect([0, 15, 30].map((v) => levelOf('defense', v))).toEqual([1, 2, 3]);
  });
});

describe('detectMilestones', () => {
  it('기록이 없으면 빈 배열', () => {
    expect(detectMilestones(store({}), new Set())).toEqual([]);
  });

  it('항목별로 L2·L3에 처음 닿은 기록만 (이후 기록은 무시)', () => {
    const s = store({
      sessions: [
        done('a', '2026-10-01T10:00:00+09:00', sc(0, 0, 0)),
        done('b', '2026-10-02T10:00:00+09:00', sc(15, 0, 0)),
        done('c', '2026-10-03T10:00:00+09:00', sc(30, 20, 0)),
        done('d', '2026-10-04T10:00:00+09:00', sc(30, 40, 15)),
      ],
    });
    const ms = detectMilestones(s, new Set());
    const get = (dim: string, level: number) => ms.find((m) => m.dim === dim && m.level === level);
    expect(get('consistency', 2)?.recordId).toBe('b');
    expect(get('consistency', 3)?.recordId).toBe('c');
    expect(get('evidence', 2)?.recordId).toBe('c');
    expect(get('evidence', 3)?.recordId).toBe('d');
    expect(get('defense', 2)?.recordId).toBe('d');
    expect(get('defense', 3)).toBeUndefined();
    expect(get('consistency', 2)).toMatchObject({ kind: 'argue', topic: '주제 b', at: '2026-10-02T10:00:00+09:00', id: 'consistency:L2' });
  });

  it('첫 기록이 곧바로 만점이면 L2·L3 모두 그 기록, 정렬은 최신순(같으면 높은 단계 먼저)', () => {
    const ms = detectMilestones(store({ sessions: [done('a', '2026-10-01T10:00:00+09:00', sc(30, 0, 0))] }), new Set());
    expect(ms.map((m) => m.id)).toEqual(['consistency:L3', 'consistency:L2']);
  });

  it('seen에 있는 것은 isNew=false', () => {
    const ms = detectMilestones(store({ sessions: [done('a', '2026-10-01T10:00:00+09:00', sc(15, 20, 0))] }), new Set(['consistency:L2']));
    expect(ms.find((m) => m.id === 'consistency:L2')?.isNew).toBe(false);
    expect(ms.find((m) => m.id === 'evidence:L2')?.isNew).toBe(true);
  });

  it('진단·아레나 점수도 센다(주제 없음), scoreAfter 없는 기록은 건너뛴다', () => {
    const diag: DiagnosticRecord = { id: 'd1', at: '2026-10-01T09:00:00+09:00', prompt: '', text: '', score: sc(15, 0, 0) };
    const arena: ArenaRecord = {
      id: 'ar1',
      topicId: 'x',
      side: 'pro',
      startedAt: '2026-10-02T09:00:00+09:00',
      completedAt: '2026-10-02T09:30:00+09:00',
      turns: [],
      result: { ...sc(0, 0, 15), verdict: 'win', lessons: [] },
    };
    const open = done('o', '2026-10-03T09:00:00+09:00', sc(30, 40, 30), { completedAt: undefined, scoreAfter: undefined });
    const ms = detectMilestones(store({ diagnostics: [diag], arenas: [arena], sessions: [open] }), new Set());
    expect(ms.find((m) => m.id === 'consistency:L2')).toMatchObject({ kind: 'diagnostic', recordId: 'd1', topic: undefined });
    expect(ms.find((m) => m.id === 'defense:L2')).toMatchObject({ kind: 'arena', recordId: 'ar1', at: '2026-10-02T09:30:00+09:00' });
    expect(ms).toHaveLength(2);
  });
});

describe('nextMilestone', () => {
  it('기록이 없거나 모두 L3이면 null', () => {
    expect(nextMilestone(store({}))).toBeNull();
    expect(nextMilestone(store({ sessions: [done('a', '2026-10-01T10:00:00+09:00', sc(30, 40, 30))] }))).toBeNull();
  });

  it('항목별 최고 단계의 다음 단계 중 최근 점수가 문턱에 가장 가까운 것', () => {
    // 일관성 L3 도달, 근거 L2 도달(40 필요), 방어 아직 L1(15 필요, 최근 0)
    const s = store({
      sessions: [done('a', '2026-10-01T10:00:00+09:00', sc(30, 20, 0)), done('b', '2026-10-02T10:00:00+09:00', sc(15, 20, 0))],
    });
    // 근거 L3: (40-20)/40=0.5, 방어 L2: (15-0)/30=0.5 → 동률이면 낮은 단계(방어 L2)
    expect(nextMilestone(s)).toEqual({ dim: 'defense', level: 2, hintKey: 'hintDefense' });
  });

  it('최근 점수가 문턱에 더 가까운 항목을 고른다', () => {
    const s = store({ sessions: [done('a', '2026-10-01T10:00:00+09:00', sc(15, 20, 15))] });
    // 일관성 L3 (30-15)/30=0.5, 근거 L3 (40-20)/40=0.5, 방어 L3 0.5 → 동률 → 순서상 첫 항목
    expect(nextMilestone(s)).toEqual({ dim: 'consistency', level: 3, hintKey: 'hintConsistency' });
  });
});

describe('seen 저장', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('저장소가 없어도(예외) 빈 집합, 쓰기는 조용히 무시', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadSeen().size).toBe(0);
    expect(() => markSeen(['a'])).not.toThrow();
  });

  it('markSeen은 기존 값에 합치고, 깨진 JSON은 무시한다', () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) });
    markSeen(['a:L2']);
    markSeen(['a:L2', 'b:L3']);
    expect([...loadSeen()].sort()).toEqual(['a:L2', 'b:L3']);
    mem.set(SEEN_KEY, '{oops');
    expect(loadSeen().size).toBe(0);
  });
});

describe('keepNew — 이번 방문 동안 NEW 유지', () => {
  const s = store({ sessions: [done('a', '2026-10-01T10:00:00+09:00', sc(15, 0, 0))] });

  it('처음 NEW였던 id는 이후 seen 처리돼 다시 계산돼도 계속 NEW', () => {
    const sticky = new Set<string>();
    const first = keepNew(detectMilestones(s, new Set()), sticky);
    expect(first.map((m) => m.isNew)).toEqual([true]);
    // 마운트 후 markSeen으로 seen에 들어간 뒤 store 변경으로 재계산
    const again = keepNew(detectMilestones(s, new Set(['consistency:L2'])), sticky);
    expect(again.map((m) => m.isNew)).toEqual([true]);
  });

  it('원래 NEW가 아니던 것은 NEW로 바뀌지 않고, 새 방문(빈 sticky)에서는 NEW가 아니다', () => {
    expect(keepNew(detectMilestones(s, new Set(['consistency:L2'])), new Set()).map((m) => m.isNew)).toEqual([false]);
  });
});
