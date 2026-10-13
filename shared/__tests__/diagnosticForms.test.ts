import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_FORMS, formFromPromptIndex, pickForm, type DiagnosticForm } from "../diagnosticForms";

/** 한 사용자가 n번 진단을 받는 동안 pickForm이 낸 폼 순서 */
function run(n: number, opts: { seed?: string; pilot?: boolean }) {
  const used: DiagnosticForm[] = [];
  for (let i = 0; i < n; i++) used.push(pickForm({ used, ...opts }));
  return used;
}

describe("pickForm", () => {
  it("안 쓴 폼이 있는 동안 재출제하지 않는다", () => {
    for (const opts of [{}, { seed: "u1" }, { seed: "u2", pilot: true }, { pilot: true }]) {
      expect(new Set(run(4, opts)).size).toBe(4);
    }
  });

  it("모두 썼으면 가장 오래전에 쓴 폼부터 다시 쓴다", () => {
    const used: DiagnosticForm[] = ["f2", "f0", "f3", "f1"];
    expect(pickForm({ used })).toBe("f2");
    expect(pickForm({ used: ["f2", "f0", "f3", "f1", "f2"] })).toBe("f0");
  });

  it("같은 입력이면 같은 결과(결정적)", () => {
    expect(run(6, { seed: "abc" })).toEqual(run(6, { seed: "abc" }));
    expect(run(6, { seed: "abc", pilot: true })).toEqual(run(6, { seed: "abc", pilot: true }));
  });

  it("시드가 없으면 f0부터 순서대로", () => {
    expect(run(4, {})).toEqual(["f0", "f1", "f2", "f3"]);
  });

  it("시드가 다르면 시작 폼이 분산된다", () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => pickForm({ used: [], seed: `user-${i}` })));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("파일럿: 사전·사후 교차 대칭(f0→f1 / f1→f0)이 두 슬롯 모두 나온다", () => {
    const pairs = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      const [pre, post] = run(2, { seed: `p${i}`, pilot: true });
      const k = `${pre}>${post}`;
      pairs.set(k, (pairs.get(k) ?? 0) + 1);
    }
    expect([...pairs.keys()].sort()).toEqual(["f0>f1", "f1>f0"]);
    const [a, b] = [...pairs.values()];
    expect(Math.abs(a - b)).toBeLessThan(60); // 대략 균형(200명 중)
  });

  it("파일럿: 사전·사후는 항상 서로 다른 폼, 같은 폼 집합", () => {
    for (let i = 0; i < 50; i++) {
      const [pre, post] = run(2, { seed: `s${i}`, pilot: true });
      expect(pre).not.toBe(post);
      expect(new Set([pre, post])).toEqual(new Set(["f0", "f1"]));
    }
  });
});

describe("formFromPromptIndex", () => {
  it("prompt0..3 → f0..f3", () => {
    expect([0, 1, 2, 3].map(formFromPromptIndex)).toEqual([...DIAGNOSTIC_FORMS]);
    expect(() => formFromPromptIndex(4)).toThrow(RangeError);
    expect(() => formFromPromptIndex(-1)).toThrow(RangeError);
  });
});
