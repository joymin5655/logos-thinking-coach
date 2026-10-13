/*
 * growth 카드들이 함께 쓰는 작은 조각. 색은 모두 logos-ui의 토큰(--l-*)이라 다크/라이트를 따른다.
 */
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { track } from '@/lib/track';
import type { EventName } from '../../../../shared/events';

/** 마운트 때 한 번만 이벤트를 보낸다(StrictMode 이중 실행 방지). */
export function useTrackOnce(name: EventName, props?: Record<string, unknown>, enabled = true) {
  const sent = useRef(false);
  useEffect(() => {
    if (!enabled || sent.current) return;
    sent.current = true;
    track(name, props);
    // props는 첫 노출 시점의 값만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

/** text 안의 needle(첫 번째 위치)을 <strong>으로 감싼다. 없으면 그대로. */
export function emphasize(text: string, needle: string): ReactNode {
  const i = needle ? text.indexOf(needle) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <strong>{needle}</strong>
      {text.slice(i + needle.length)}
    </>
  );
}

/** 'YYYY-MM-DD' → 'MM.DD' */
export const mmdd = (date: string) => `${date.slice(5, 7)}.${date.slice(8, 10)}`;
