/*
 * StreakRiskBanner — 저녁 19시 이후 오늘 아직 기록이 없을 때 뜨는 연속 기록 경고.
 * 표시 여부는 streakRisk()가 판정하고(risk.show), 이 컴포넌트는 show가 true일 때만 그린다.
 * 닫기는 부모가 saveDismissedDay(오늘)로 저장하고 상태를 바꾼다. 쉬어가기는 자동 적용이라 버튼이 아닌 남은 횟수만 보여 준다.
 */
import { Link } from 'wouter';
import { T, body, mono } from '@/components/logos-ui';
import { useT } from '@/i18n';
import type { StreakRisk } from '@/lib/streakRisk';
import { track } from '@/lib/track';
import { emphasize, useTrackOnce } from './shared';

const cta = { minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: body, fontSize: 14 } as const;

export function StreakRiskBanner({ risk, onDismiss, startHref = '/dashboard/argue' }: { risk: StreakRisk; onDismiss: () => void; startHref?: string }) {
  const t = useT('growth');
  useTrackOnce('streak_banner_view', { streak: risk.streak, hours_left: risk.hoursLeft }, risk.show);
  if (!risk.show) return null;

  const time = risk.hoursLeft > 0 ? t('streakTimeHM', { h: risk.hoursLeft, m: risk.minutesLeft }) : t('streakTimeM', { m: risk.minutesLeft });
  const body1 = t('streakBody', { n: risk.streak, time });
  const freeze = risk.freezeLeft > 0 ? t('streakFreezeLeft', { n: risk.freezeLeft }) : t('streakFreezeUsed');

  return (
    <section
      aria-label={t('streakAria')}
      style={{ border: `1px solid ${T.amber}`, backgroundColor: 'color-mix(in srgb, var(--l-amber) 8%, transparent)', padding: 16, display: 'grid', gap: 10 }}
    >
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: T.amber }}>{t('streakLabel')}</span>
      <p style={{ margin: 0, fontFamily: body, fontSize: 15, lineHeight: 1.55, color: T.cream }}>{emphasize(body1, time)}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link
          href={startHref}
          className="lg-btn"
          onClick={() => track('streak_banner_click', { action: 'start' })}
          style={{ ...cta, flex: 1, backgroundColor: T.cream, color: 'var(--l-on-fg)', textDecoration: 'none', fontWeight: 500 }}
        >
          {t('streakStart')}
        </Link>
        <button
          type="button"
          className="lg-btn"
          onClick={() => {
            track('streak_banner_click', { action: 'close' });
            onDismiss();
          }}
          style={{ ...cta, padding: '0 16px', background: 'transparent', border: `1px solid ${T.borderMid}`, color: T.cream, cursor: 'pointer' }}
        >
          {t('streakClose')}
        </button>
      </div>
      <span style={{ fontFamily: body, fontSize: 12, color: T.creamDim }}>
        {freeze} · {t('streakDismissNote')}
      </span>
    </section>
  );
}
