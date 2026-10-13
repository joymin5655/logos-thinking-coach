/*
 * Settings.tsx — 언어·테마, 데이터 내보내기, 사전 알림 신청 현황, 기록 삭제, 계정 삭제
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { T, mono, serif, sans, body, Label, btnPrimary, btnGhost, btnDisabled, panelStyle, FocusStyle } from '@/components/logos-ui';
import { useTheme, type ThemePref } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/auth';
import { getAnonId, resetAnonymous } from '@/lib/track';
import { supabase } from '@/lib/supabase';
import { flush, pullAll, resetSync } from '@/lib/sync';
import { clearLocal, exportJSON, toISODate, updateStore } from '@/lib/store';
import { downloadFile } from '@/lib/ics';
import { formatDate, useLocale, useT, type Locale } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';
import { ALL_FIELDS, MAX_FIELDS, clearFields, loadFields, saveFields, type Field } from '@/lib/preferences';
import { FIELD_KEY } from '@/lib/fieldKeys';
import { fetchMyMeta, withdrawConsent, type MyMeta } from '@/lib/cohort';

type WaitRow = { plan: string; created_at: string };

const dangerBtn = { ...btnGhost, color: T.error, borderColor: T.error } as const;
const dialogStyle = { backgroundColor: T.black, color: T.cream, border: `1px solid ${T.borderMid}`, borderRadius: 0, fontFamily: sans } as const;

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ ...panelStyle, display: 'grid', gap: 12 }}>
      <Label>{heading}</Label>
      {children}
    </section>
  );
}

const lead = { margin: 0, fontFamily: body, letterSpacing: 'normal', fontSize: 13, lineHeight: 1.7, color: T.creamMid } as const;

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" className="lg-btn" aria-pressed={active} onClick={onClick}
      style={{ ...btnGhost, padding: '8px 14px', fontSize: 11, textTransform: 'none', letterSpacing: '0.05em', backgroundColor: active ? T.cream : 'transparent', color: active ? 'var(--l-on-fg)' : T.cream, borderColor: active ? T.cream : T.borderMid }}
    >
      {children}
    </button>
  );
}

/** 로컬 캐시를 비우되 이 계정의 것으로 남겨, 이후 새 기록이 계속 동기화되게 한다. 남은 outbox는 flush 때 걸러진다. */
function resetLocalFor(uid: string) {
  clearLocal();
  updateStore((s) => ({ ...s, ownerId: uid }));
}

export default function Settings() {
  const t = useT('settings');
  const td = useT('dashboard');
  const [, navigate] = useLocation();
  const { locale, setLocale } = useLocale();
  const { pref, setPref } = useTheme();
  const { user, ready } = useAuth();
  const uid = user?.id;
  usePageMeta('settings', { noindex: true });
  const planLabel = (p: string) => (p === 'pro' ? t('planPro') : p === 'team' ? t('planTeam') : p);

  const [exporting, setExporting] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitRow[] | null>(null);
  const [waitFailed, setWaitFailed] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const [pilot, setPilot] = useState<MyMeta | null>(null);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [fields, setFields] = useState<Field[]>(() => loadFields());
  const toggleField = (f: Field) => {
    const next = fields.includes(f) ? fields.filter((x) => x !== f) : fields.length >= MAX_FIELDS ? fields : [...fields, f];
    setFields(next);
    if (next.length) saveFields(next);
    else clearFields();
  };

  const loadWaitlist = useCallback(async () => {
    if (!supabase || !uid) return;
    const { data, error } = await supabase.from('waitlist').select('plan, created_at').order('created_at', { ascending: true });
    setWaitFailed(!!error);
    setWaitlist(error || !data ? [] : (data as WaitRow[]));
  }, [uid]);

  useEffect(() => {
    void loadWaitlist();
  }, [loadWaitlist]);

  const loadPilot = useCallback(async () => {
    if (!uid) return;
    setPilot(await fetchMyMeta());
  }, [uid]);

  useEffect(() => {
    void loadPilot();
  }, [loadPilot]);

  const exportData = async () => {
    if (!uid) return;
    setExporting(true);
    let fresh = false;
    try {
      await flush();
      fresh = await pullAll(uid);
    } catch {
      fresh = false;
    }
    downloadFile(`logos-export-${toISODate(new Date())}.json`, exportJSON(), 'application/json');
    toast(fresh ? t('exportDone') : t('exportLocalOnly'));
    setExporting(false);
  };

  const cancelWaitlist = async (plan: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('waitlist').delete().eq('plan', plan);
    if (error) {
      toast.error(t('waitlistCancelFailed'));
      return;
    }
    toast(t('waitlistCancelled'));
    setWaitlist((rows) => (rows ?? []).filter((r) => r.plan !== plan));
  };

  const withdraw = async () => {
    setBusy(true);
    const ok = await withdrawConsent();
    setBusy(false);
    if (!ok) {
      toast.error(t('pilotWithdrawFailed'));
      return;
    }
    setPilotOpen(false);
    toast(t('pilotWithdrawDone'));
    await loadPilot();
  };

  const deleteData = async () => {
    if (!supabase || !uid) return;
    setBusy(true);
    resetSync({ keepUid: true }); // 보낼 outbox를 먼저 비워 삭제 뒤에 되살아나지 않게 한다
    const { error } = await supabase.rpc('delete_my_data', { p_anon: getAnonId() });
    if (error) {
      setBusy(false);
      toast.error(t('dataFailed'));
      return;
    }
    resetLocalFor(uid);
    resetAnonymous(); // 이 기기의 익명 이벤트는 위 호출로 지웠으니 id도 새로 시작한다
    setWaitlist([]);
    setPilot(null);
    setBusy(false);
    setDataOpen(false);
    toast(t('dataDone'));
  };

  const deleteAccount = async () => {
    if (!supabase) return;
    setBusy(true);
    resetSync({ keepUid: true });
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      setBusy(false);
      toast.error(t('accountFailed'));
      return;
    }
    clearLocal();
    resetSync();
    resetAnonymous();
    await supabase.auth.signOut({ scope: 'local' });
    setBusy(false);
    setAccountOpen(false);
    toast(t('accountDone'));
    navigate('/');
  };

  const word = t('accountWord');
  const wordOk = typed.trim().toLowerCase() === word.toLowerCase();
  const langs: { v: Locale; label: string }[] = [{ v: 'ko', label: t('langKo') }, { v: 'en', label: t('langEn') }];
  const themes: { v: ThemePref; label: string }[] = [
    { v: 'light', label: t('themeLight') },
    { v: 'dark', label: t('themeDark') },
    { v: 'system', label: t('themeSystem') },
  ];

  return (
    <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
      <FocusStyle />
      <div style={{ display: 'grid', gap: 20, maxWidth: 760 }}>
        <Section heading={t('prefsHeading')}>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('language')}</span>
            <div role="group" aria-label={t('language')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {langs.map((l) => <Choice key={l.v} active={locale === l.v} onClick={() => setLocale(l.v)}>{l.label}</Choice>)}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('theme')}</span>
            <div role="group" aria-label={t('theme')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {themes.map((o) => <Choice key={o.v} active={pref === o.v} onClick={() => setPref(o.v)}>{o.label}</Choice>)}
            </div>
          </div>
        </Section>

        <Section heading={td('fieldPickLabel')}>
          <p style={lead}>{td('fieldPickLead', { max: MAX_FIELDS })}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label={td('fieldGroup')}>
            {ALL_FIELDS.map((opt) => {
              const picked = fields.includes(opt.value);
              const atCap = !picked && fields.length >= MAX_FIELDS;
              return (
                <button key={opt.value} type="button" className="lg-btn" aria-pressed={picked} disabled={atCap} onClick={() => toggleField(opt.value)}
                  style={{ ...btnGhost, padding: '8px 14px', fontSize: 11, textTransform: 'none', letterSpacing: '0.05em', backgroundColor: picked ? T.cream : 'transparent', color: picked ? 'var(--l-on-fg)' : atCap ? T.creamDim : T.creamMid, borderColor: picked ? T.cream : T.borderMid, cursor: atCap ? 'not-allowed' : 'pointer' }}>
                  {td(FIELD_KEY[opt.value])}
                </button>
              );
            })}
          </div>
        </Section>

        {!ready || !supabase ? (
          <p role="status" style={{ ...lead, padding: 12, border: `1px solid ${T.borderMid}`, color: T.amber }}>{t('notReady')}</p>
        ) : (
          <>
            <Section heading={t('exportHeading')}>
              <p style={lead}>{t('exportLead')}</p>
              <div>
                <button type="button" className="lg-btn" style={{ ...btnPrimary, ...(exporting ? btnDisabled : {}) }} disabled={exporting} onClick={() => void exportData()}>
                  {exporting ? t('exporting') : t('exportButton')}
                </button>
              </div>
            </Section>

            <Section heading={t('waitlistHeading')}>
              {waitlist === null ? (
                <p style={lead}>{t('waitlistLoading')}</p>
              ) : waitFailed ? (
                <p style={{ ...lead, color: T.error }}>{t('waitlistLoadFailed')}</p>
              ) : waitlist.length === 0 ? (
                <p style={lead}>{t('waitlistEmpty')}</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
                  {waitlist.map((r) => (
                    <li key={r.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderTop: `1px solid ${T.border}` }}>
                      <span style={{ fontFamily: mono, fontSize: 12, color: T.cream }}>
                        <strong>{planLabel(r.plan)}</strong>
                        <span style={{ color: T.creamMid }}> · {t('waitlistSince', { date: formatDate(r.created_at, { year: 'numeric', month: 'short', day: 'numeric' }) })}</span>
                      </span>
                      <button type="button" className="lg-btn" style={{ ...btnGhost, padding: '6px 12px', fontSize: 10 }} onClick={() => void cancelWaitlist(r.plan)}>
                        {t('waitlistCancel')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {pilot?.cohort_code && (
              <Section heading={t('pilotHeading')}>
                {pilot.consent_at ? (
                  <>
                    <p style={{ ...lead, color: T.cream }}>{t('pilotStatus', { code: pilot.cohort_code, date: toISODate(new Date(pilot.consent_at)) })}</p>
                    <p style={lead}>{t('pilotLead')}</p>
                    <div><button type="button" className="lg-btn" style={dangerBtn} onClick={() => setPilotOpen(true)}>{t('pilotWithdrawButton')}</button></div>
                  </>
                ) : (
                  <p style={lead}>{t('pilotWithdrawn', { code: pilot.cohort_code })}</p>
                )}
              </Section>
            )}

            <Section heading={t('dataHeading')}>
              <p style={lead}>{t('dataLead')}</p>
              <div><button type="button" className="lg-btn" style={dangerBtn} onClick={() => setDataOpen(true)}>{t('dataButton')}</button></div>
            </Section>

            <Section heading={t('accountHeading')}>
              <p style={lead}>{t('accountLead')}</p>
              <div><button type="button" className="lg-btn" style={dangerBtn} onClick={() => { setTyped(''); setAccountOpen(true); }}>{t('accountButton')}</button></div>
            </Section>
          </>
        )}
      </div>

      <AlertDialog open={pilotOpen} onOpenChange={(o) => !busy && setPilotOpen(o)}>
        <AlertDialogContent style={dialogStyle}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: serif, fontSize: 20 }}>{t('pilotWithdrawTitle')}</AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: 13, lineHeight: 1.7, color: T.creamMid }}>{t('pilotWithdrawBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} style={{ borderRadius: 0, background: 'transparent', color: T.cream, borderColor: T.borderMid }}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); void withdraw(); }}
              style={{ borderRadius: 0, backgroundColor: T.error, color: 'var(--l-on-fg)' }}
            >
              {busy ? t('pilotWithdrawing') : t('pilotWithdrawConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dataOpen} onOpenChange={(o) => !busy && setDataOpen(o)}>
        <AlertDialogContent style={dialogStyle}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: serif, fontSize: 20 }}>{t('dataConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: 13, lineHeight: 1.7, color: T.creamMid }}>{t('dataConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} style={{ borderRadius: 0, background: 'transparent', color: T.cream, borderColor: T.borderMid }}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); void deleteData(); }}
              style={{ borderRadius: 0, backgroundColor: T.error, color: 'var(--l-on-fg)' }}
            >
              {busy ? t('dataDeleting') : t('dataConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={accountOpen} onOpenChange={(o) => !busy && setAccountOpen(o)}>
        <AlertDialogContent style={dialogStyle}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: serif, fontSize: 20 }}>{t('accountConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: 13, lineHeight: 1.7, color: T.creamMid }}>{t('accountConfirmBody', { word })}</AlertDialogDescription>
          </AlertDialogHeader>
          <input
            className="lg-field" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={t('accountInputLabel')}
            autoComplete="off" autoCapitalize="off" spellCheck={false}
            style={{ fontFamily: mono, fontSize: 13, color: T.cream, backgroundColor: T.black, border: `1px solid ${T.borderMid}`, padding: '10px 12px', width: '100%', boxSizing: 'border-box' }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} style={{ borderRadius: 0, background: 'transparent', color: T.cream, borderColor: T.borderMid }}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !wordOk}
              onClick={(e) => { e.preventDefault(); void deleteAccount(); }}
              style={{ borderRadius: 0, backgroundColor: T.error, color: 'var(--l-on-fg)' }}
            >
              {busy ? t('accountDeleting') : t('accountConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
