// 진단 문항 폼 — Diagnostic.tsx의 prompt0..3(DIAGNOSTIC_PROMPTS)과 같은 순서로 f0..f3에 대응한다.
// 재진단에서 같은 폼을 다시 내지 않고, 파일럿에서는 사전·사후 폼을 사용자별로 교차 배정한다.

export const DIAGNOSTIC_FORMS = ["f0", "f1", "f2", "f3"] as const;
export type DiagnosticForm = (typeof DIAGNOSTIC_FORMS)[number];

export function formFromPromptIndex(i: number): DiagnosticForm {
  const f = DIAGNOSTIC_FORMS[i];
  if (!f) throw new RangeError(`prompt index out of range: ${i}`);
  return f;
}

/** FNV-1a 32비트 — 외부 의존 없이 결정적. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface PickFormArgs {
  /** 이미 받은 폼, 오래된 것부터 */
  used: DiagnosticForm[];
  /** 사용자별 결정적 시드(예: 사용자 id) */
  seed?: string;
  /** 파일럿: 사전/사후 교차 균형(slot 0 = f0→f1, slot 1 = f1→f0) */
  pilot?: boolean;
}

/**
 * 안 쓴 폼이 있는 동안 중복 출제하지 않는다. 모두 썼으면 가장 오래전에 쓴 폼(used 앞쪽)을 고른다.
 * 비파일럿: hash(seed)%4부터 순환하며 첫 미사용 폼. 시드 없으면 f0부터.
 */
export function pickForm({ used, seed, pilot }: PickFormArgs): DiagnosticForm {
  const n = DIAGNOSTIC_FORMS.length;
  let order: DiagnosticForm[];
  if (pilot) {
    const slot = hash(seed ?? "") % 2;
    order = slot === 0 ? ["f0", "f1", "f2", "f3"] : ["f1", "f0", "f2", "f3"];
  } else {
    const start = seed ? hash(seed) % n : 0;
    order = Array.from({ length: n }, (_, i) => DIAGNOSTIC_FORMS[(start + i) % n]);
  }
  const unused = order.find((f) => !used.includes(f));
  if (unused) return unused;
  // 모두 사용: 마지막 사용 위치가 가장 앞선(= 가장 오래된) 폼
  return order.reduce((a, b) => (used.lastIndexOf(b) < used.lastIndexOf(a) ? b : a));
}
