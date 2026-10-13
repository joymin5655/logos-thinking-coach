/*
 * PolicyText — 방침·약관 본문 문단. 줄바꿈(\n)을 살리고 http(s) 주소를 링크로 바꾼다.
 */
import type { ReactNode } from 'react';
import { splitPolicyText } from '@/lib/policyText';

export const policyPara = { margin: 0, fontSize: 14, lineHeight: 1.8, letterSpacing: 'normal', wordBreak: 'keep-all', whiteSpace: 'pre-line', color: 'var(--l-fg-mid)' } as const;

export function PolicyText({ text }: { text: string }): ReactNode {
  return splitPolicyText(text).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--l-fg)', textDecoration: 'underline', overflowWrap: 'anywhere' }}>{part}</a>
    ) : (
      part
    ),
  );
}
