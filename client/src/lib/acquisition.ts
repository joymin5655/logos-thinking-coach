/*
 * acquisition.ts — 최초 유입(first-touch) 파악. utm_*가 우선이고, 없으면 referrer의 host만 쓴다(전체 URL·쿼리는 저장하지 않는다).
 * 첫 방문 한 번만 localStorage(logos.touch)에 저장하고, 로그인 때 claim_profile로 서버에 넘긴다.
 */
export const TOUCH_KEY = 'logos.touch';
const MAX = 64;

export type Touch = { source?: string; medium?: string; campaign?: string; ref_host?: string };

const clean = (v: string | null | undefined) => {
  const s = (v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX);
  return s || undefined;
};

const hostOf = (referrer: string) => {
  try {
    return referrer ? new URL(referrer).hostname.toLowerCase() : '';
  } catch {
    return '';
  }
};

/** URL과 referrer에서 유입 정보를 뽑는다. selfHost와 같은 referrer(내부 이동)는 무시한다. */
export function parseTouch(url: URL, referrer: string, selfHost: string): Touch {
  const p = url.searchParams;
  const out: Touch = {};
  const source = clean(p.get('utm_source'));
  const medium = clean(p.get('utm_medium'));
  const campaign = clean(p.get('utm_campaign'));
  if (source) out.source = source;
  if (medium) out.medium = medium;
  if (campaign) out.campaign = campaign;
  const host = hostOf(referrer);
  if (host && host !== selfHost.toLowerCase()) out.ref_host = clean(host);
  return out;
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** 저장된 first-touch. 없거나 손상됐으면 빈 객체. */
export function getTouch(): Touch {
  try {
    const raw = store()?.getItem(TOUCH_KEY);
    const v: unknown = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Touch) : {};
  } catch {
    return {};
  }
}

/** 처음 방문한 때 한 번만 저장한다(이미 저장돼 있으면 그대로). 유입 정보가 없어도 빈 값을 저장해 다시 덮어쓰지 않는다. */
export function captureTouchOnce(): void {
  if (typeof window === 'undefined') return;
  const ls = store();
  try {
    if (!ls || ls.getItem(TOUCH_KEY) !== null) return;
    ls.setItem(TOUCH_KEY, JSON.stringify(parseTouch(new URL(location.href), document.referrer, location.hostname)));
  } catch {
    /* 저장 불가 */
  }
}
