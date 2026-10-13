/*
 * Privacy.tsx — 개인정보 처리방침. 문구는 i18n 'privacy'.
 */
import MarketingLayout from '@/components/MarketingLayout';
import { PolicyText, policyPara as para } from '@/components/PolicyText';
import { useT } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';

type Key = Parameters<ReturnType<typeof useT<'privacy'>>>[0];

// 섹션별 문단·목록 개수. 키 이름은 s<N>p<i>, s<N>l<i>. 문단은 pre개가 목록 앞, 나머지가 목록 뒤.
const SECTIONS = [
  { n: 1, pre: 1, l: 2, post: 0 },
  { n: 2, pre: 1, l: 10, post: 1 },
  { n: 3, pre: 0, l: 8, post: 0 },
  { n: 4, pre: 0, l: 6, post: 1 },
  { n: 5, pre: 1, l: 3, post: 1 },
  { n: 6, pre: 1, l: 4, post: 1 },
  { n: 7, pre: 1, l: 5, post: 1 },
  { n: 8, pre: 1, l: 4, post: 1 },
  { n: 9, pre: 1, l: 0, post: 0 },
  { n: 10, pre: 1, l: 5, post: 2 },
  { n: 11, pre: 1, l: 5, post: 1 },
  { n: 12, pre: 1, l: 4, post: 0 },
  { n: 13, pre: 1, l: 0, post: 0 },
] as const;

const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

export default function Privacy() {
  usePageMeta('privacy');
  const t = useT('privacy');
  const k = (s: string) => s as Key;
  return (
    <MarketingLayout>
      <main style={{ backgroundColor: 'var(--l-bg)', color: 'var(--l-fg)', padding: '5.5rem 1.5rem 4rem', fontFamily: 'var(--font-body)' }}>
        <article style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 28 }}>
          <header style={{ display: 'grid', gap: 12 }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.7rem, 4vw, 2.3rem)', letterSpacing: '-0.02em' }}>{t('title')}</h1>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--l-fg-mid)' }}>{t('effective')}</p>
          </header>

          {SECTIONS.map(({ n, pre, l, post }) => (
            <section key={n} style={{ display: 'grid', gap: 10 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20 }}>{t(k(`s${n}Title`))}</h2>
              {range(1, pre).map((i) => <p key={`p${i}`} style={para}><PolicyText text={t(k(`s${n}p${i}`))} /></p>)}
              {l > 0 && (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                  {range(1, l).map((i) => <li key={i} style={para}><PolicyText text={t(k(`s${n}l${i}`))} /></li>)}
                </ul>
              )}
              {range(pre + 1, post).map((i) => <p key={`p${i}`} style={para}><PolicyText text={t(k(`s${n}p${i}`))} /></p>)}
              {n === 1 && (
                <p style={para}>
                  {t('contactLabel')}: <a href={`mailto:${t('contactEmail')}`} style={{ color: 'var(--l-fg)' }}>{t('contactEmail')}</a>
                </p>
              )}
            </section>
          ))}
        </article>
      </main>
    </MarketingLayout>
  );
}

