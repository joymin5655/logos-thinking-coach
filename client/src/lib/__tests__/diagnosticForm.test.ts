import { describe, it, expect } from 'vitest';
import { pickForm } from '../../../../shared/diagnosticForms';
import { diagnosticForm, usedDiagnosticForms, type DiagnosticRecord } from '../store';
import { translate } from '../../i18n';

const score = { consistency: 15, evidence: 20, defense: 15, total: 50, rationale: '' };
const rec = (prompt: string, form?: DiagnosticRecord['form']): DiagnosticRecord => ({ at: '2026-10-01T00:00:00Z', prompt, text: '', score, form });

describe('diagnosticForm — 옛 기록의 폼 역추적', () => {
  it('form이 있으면 그대로', () => {
    expect(diagnosticForm(rec('아무 문항', 'f2'), 0)).toBe('f2');
  });
  it('한국어·영어 문항 텍스트로 찾는다', () => {
    expect(diagnosticForm(rec(translate('diagnostic', 'prompt2', undefined, 'ko')), 0)).toBe('f2');
    expect(diagnosticForm(rec(translate('diagnostic', 'prompt3', undefined, 'en')), 0)).toBe('f3');
  });
  it('텍스트가 맞지 않으면 순번 % 4로 추정한다', () => {
    expect(diagnosticForm(rec('옛 문항'), 1)).toBe('f1');
    expect(diagnosticForm(rec('옛 문항'), 6)).toBe('f2');
  });
  it('usedDiagnosticForms는 오래된 것부터 폼을 모은다', () => {
    const ds = [rec(translate('diagnostic', 'prompt0', undefined, 'ko')), rec('옛 문항'), rec('x', 'f3')];
    expect(usedDiagnosticForms(ds)).toEqual(['f0', 'f1', 'f3']);
  });
  it('since를 주면 그 이후 기록만 센다(파일럿: 참가 전 진단은 사전/사후 순서에서 뺀다)', () => {
    const at = (iso: string, form: DiagnosticRecord['form']): DiagnosticRecord => ({ ...rec('x', form), at: iso });
    const ds = [at('2026-09-20T00:00:00Z', 'f0'), at('2026-10-05T00:00:00Z', 'f1')];
    expect(usedDiagnosticForms(ds, '2026-10-01T00:00:00Z')).toEqual(['f1']);
    expect(usedDiagnosticForms(ds, null)).toEqual(['f0', 'f1']);
    expect(usedDiagnosticForms(ds, 'invalid')).toEqual(['f0', 'f1']);
    // 참가 전에 f0를 쓴 사람의 첫 파일럿 진단: 참가 이후 기준이면 슬롯대로 사전 폼(f0 또는 f1)부터 시작한다
    for (const seed of ['a', 'b', 'c', 'd']) {
      const pre = pickForm({ used: usedDiagnosticForms([at('2026-09-20T00:00:00Z', 'f0')], '2026-10-01T00:00:00Z'), seed, pilot: true });
      expect(pre).toBe(pickForm({ used: [], seed, pilot: true }));
    }
  });
});
