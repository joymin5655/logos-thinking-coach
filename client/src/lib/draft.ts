/*
 * draft.ts — 작성 중인 글을 경로별로 sessionStorage에 잠깐 보관한다.
 * 401로 로그인 화면에 갔다 돌아와도 쓰던 글이 남게 하는 용도. 저장소가 막혀 있어도 조용히 넘어간다.
 */
const PREFIX = 'logos.draft:';
const MAX_LEN = 20_000;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const store = (): Store | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
};

/** 같은 경로에 입력칸이 여럿이면 slot으로 구분한다. */
export const draftKey = (path: string, slot = 'main') => `${PREFIX}${path}#${slot}`;

export function saveDraft(key: string, text: string, s: Store | null = store()): void {
  if (!s) return;
  try {
    if (text.trim()) s.setItem(key, text.slice(0, MAX_LEN));
    else s.removeItem(key);
  } catch {
    /* 용량 초과·차단 */
  }
}

export function loadDraft(key: string, s: Store | null = store()): string {
  try {
    return s?.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function clearDraft(key: string, s: Store | null = store()): void {
  try {
    s?.removeItem(key);
  } catch {
    /* 무시 */
  }
}

/** 현재 경로의 모든 입력칸을 저장 직후 api.ts가 부를 수 있게, 화면이 등록해 둔 최신 값을 쥐고 있다. */
const live = new Map<string, string>();

export function trackDraft(key: string, text: string): void {
  if (text.trim()) live.set(key, text);
  else live.delete(key);
}

/** 로그인 화면으로 보내기 직전에 호출 — 추적 중인 입력을 모두 저장한다. */
export function flushDrafts(s: Store | null = store()): void {
  live.forEach((text, key) => saveDraft(key, text, s));
}

export function untrackDraft(key: string): void {
  live.delete(key);
}

/** 로그아웃·계정 전환 때 — 같은 탭의 다음 계정이 이전 사용자의 글을 복원하지 않게 모두 지운다. */
export function clearAllDrafts(s: Store | null = store()): void {
  live.clear();
  if (!s || !('length' in s)) return;
  try {
    const st = s as Storage;
    for (let i = st.length - 1; i >= 0; i--) {
      const k = st.key(i);
      if (k?.startsWith(PREFIX)) st.removeItem(k);
    }
  } catch {
    /* 무시 */
  }
}
