import { describe, it, expect } from 'vitest';
import { shouldSubmitOnKey, waitHintKey, placeholderFor } from '../composer';

const k = (o: Partial<Parameters<typeof shouldSubmitOnKey>[0]> = {}) => ({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false, ...o });

describe('shouldSubmitOnKey', () => {
  it('Enter sends on a fine pointer', () => expect(shouldSubmitOnKey(k(), false)).toBe(true));
  it('Shift+Enter is a newline', () => expect(shouldSubmitOnKey(k({ shiftKey: true }), false)).toBe(false));
  it('Cmd/Ctrl+Enter always sends', () => {
    expect(shouldSubmitOnKey(k({ metaKey: true }), false)).toBe(true);
    expect(shouldSubmitOnKey(k({ ctrlKey: true }), true)).toBe(true);
  });
  it('plain Enter is a newline on coarse pointers', () => expect(shouldSubmitOnKey(k(), true)).toBe(false));
  it('ignores IME composition', () => {
    expect(shouldSubmitOnKey(k({ isComposing: true }), false)).toBe(false);
    expect(shouldSubmitOnKey(k({ nativeEvent: { isComposing: true } }), false)).toBe(false);
    expect(shouldSubmitOnKey(k({ keyCode: 229 }), false)).toBe(false);
  });
  it('ignores other keys', () => expect(shouldSubmitOnKey(k({ key: 'a' }), false)).toBe(false));
});

describe('waitHintKey', () => {
  it('escalates at 8s and 25s', () => {
    expect(waitHintKey(7_999)).toBeNull();
    expect(waitHintKey(8_000)).toBe('uiSlowHint');
    expect(waitHintKey(25_000)).toBe('uiAlmostHint');
  });
});

describe('placeholderFor', () => {
  it('keeps the text in node (no matchMedia)', () => expect(placeholderFor('a (Enter)')).toBe('a (Enter)'));
});
