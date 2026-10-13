/*
 * AuthorshipCard — "이 결론은 누가 썼나". 어두운(전경색 반전) 카드. 계산은 lib/authorship.ts.
 * 모두 직접 쓴 경우에만 강조 문구를 쓰고, 겹침이 있으면 중립 문구로 사실만 말한다.
 */
import { T, body, mono, serif } from '@/components/logos-ui';
import { useT } from '@/i18n';
import type { Authorship } from '@/lib/authorship';

const ON = 'var(--l-on-fg)';
const dim = (pct: number) => `color-mix(in srgb, ${ON} ${pct}%, transparent)`;

export function AuthorshipCard({ data }: { data: Authorship }) {
  const t = useT('growth');
  if (data.userChars === 0) return null;
  const pct = data.overlap === 0 ? 0 : Math.max(1, Math.round(data.overlap * 100));

  const stats: { n: string; label: string }[] = [
    { n: String(data.coachQuestions), label: t('authQuestions') },
    { n: t('authCharsVal', { n: data.userChars }), label: t('authChars') },
    { n: `${pct}%`, label: t('authOverlap') },
  ];

  let headline: React.ReactNode;
  if (data.allYours) {
    const [pre, post = ''] = t('authAll', { em: '\u0000' }).split('\u0000');
    headline = (
      <>
        {pre}
        <strong>{t('authAllEm')}</strong>
        {post}
      </>
    );
  } else {
    headline = t('authNeutral', { pct });
  }
  const note = [t('authNoteBase'), data.allYours && data.coachQuestions > 0 ? t('authNoteAll', { n: data.coachQuestions }) : ''].filter(Boolean).join(' ');

  return (
    <section aria-label={t('authAria')} style={{ backgroundColor: T.cream, color: ON, padding: 20, display: 'grid', gap: 14 }}>
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: dim(80) }}>{t('authLabel')}</span>
      <p style={{ margin: 0, fontFamily: serif, fontSize: 22, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{headline}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, backgroundColor: dim(24), border: `1px solid ${dim(24)}` }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: T.cream, padding: '12px 10px', display: 'grid', gap: 4, minWidth: 0 }}>
            <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.n}</span>
            <span style={{ fontFamily: body, fontSize: 12, color: dim(82) }}>{s.label}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontFamily: body, fontSize: 14, lineHeight: 1.6, color: dim(82) }}>{note}</p>
    </section>
  );
}
