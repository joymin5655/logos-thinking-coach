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
import { T, mono, serif, sans, Label, btnPrimary, btnGhost, btnDisabled, panelStyle, FocusStyle } from '@/components/logos-ui';
import { useTheme, type ThemePref } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { OUTBOX_KEY, flush, pullAll } from '@/lib/sync';
import { clearLocal, exportJSON, toISODate, updateStore } from '@/lib/store';
import { downloadFile } from '@/lib/ics';
import { formatDate, useLocale, useT, type Locale } from '@/i18n';

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

const lead = { margin: 0, fontFamily: sans, fontSize: 13, lineHeight: 1.7, color: T.creamMid } as const;

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
  const [, navigate] = useLocation();
  const { locale, setLocale } = useLocale();
  const { pref, setPref } = useTheme();
  const { user, ready } = useAuth();
  const uid = user?.id;

  const [exporting, setExporting] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitRow[] | null>(null);
  const [waitFailed, setWaitFailed] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');

  const loadWaitlist = useCallback(async () => {
    if (!supabase || !uid) return;
    const { data, error } = await supabase.from('waitlist').select('plan, created_at').order('created_at', { ascending: true });
    setWaitFailed(!!error);
    setWaitlist(error || !data ? [] : (data as WaitRow[]));
  }, [uid]);

  useEffect(() => {
    void loadWaitlist();
  }, [loadWaitlist]);

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

  const deleteData = async () => {
    if (!supabase || !uid) return;
    setBusy(true);
    const { error } = await supabase.rpc('delete_my_data');
    if (error) {
      setBusy(false);
      toast.error(t('dataFailed'));
      return;
    }
    resetLocalFor(uid);
    setWaitlist([]);
    setBusy(false);
    setDataOpen(false);
    toast(t('dataDone'));
  };

  const deleteAccount = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      setBusy(false);
      toast.error(t('accountFailed'));
      return;
    }
    clearLocal();
    try {
      localStorage.removeItem(OUTBOX_KEY);
    } catch {
      /* 저장소 접근 불가 */
    }
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
    <DashboardLayout title={t('title')} titleEn="Settings">
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
                        <strong style={{ textTransform: 'capitalize' }}>{r.plan}</strong>
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
