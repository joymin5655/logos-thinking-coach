/*
 * composer.ts — 입력창·대기 안내의 순수 함수들(DOM 의존 없이 테스트한다).
 */
export const SLOW_HINT_MS = 8_000;
export const ALMOST_HINT_MS = 25_000;
/** 기다린 시간(ms)에 맞는 안내 문구 키. 8초 전에는 없다. */
export const waitHintKey = (ms: number) => (ms >= ALMOST_HINT_MS ? 'uiAlmostHint' : ms >= SLOW_HINT_MS ? 'uiSlowHint' : null);


export const isCoarsePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

type KeyLike = { key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; isComposing?: boolean; keyCode?: number; nativeEvent?: { isComposing?: boolean } };

/**
 * Enter = 전송, Shift+Enter = 줄바꿈, Cmd/Ctrl+Enter = 항상 전송.
 * 터치 기기(coarse)에서는 Enter가 줄바꿈이고 전송 버튼으로만 보낸다. 한글 조합 중 Enter는 무시한다.
 */
export function shouldSubmitOnKey(e: KeyLike, coarse: boolean = isCoarsePointer()): boolean {
  if (e.key !== 'Enter') return false;
  if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return false;
  if (e.metaKey || e.ctrlKey) return true;
  if (e.shiftKey) return false;
  return !coarse;
}

/** 터치 기기에서는 단축키 안내(괄호)를 뺀 placeholder를 쓴다. */
export const placeholderFor = (text: string) => (isCoarsePointer() ? text.replace(/\s*\([^)]*\)\s*$/, '') : text);

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

