/*
 * Telemetry.tsx — 화면 없는 계측 마운트. first-touch 저장, 기록 이벤트 연결, 라우트 진입 이벤트(landing_view·join_view·app_open)를 담당한다.
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { captureTouchOnce } from '../lib/acquisition';
import { installRecordEvents } from '../lib/recordEvents';
import { eventForPath, kstDay, track, trackingEnabled } from '../lib/track';

const APP_OPEN_KEY = 'logos.appOpenDay';

function appOpenOncePerDay() {
  try {
    const today = kstDay(Date.now());
    if (localStorage.getItem(APP_OPEN_KEY) === today) return;
    localStorage.setItem(APP_OPEN_KEY, today);
    track('app_open');
  } catch {
    /* 저장 불가 — 하루 1회를 보장할 수 없으면 보내지 않는다 */
  }
}

export default function Telemetry() {
  const [path] = useLocation();

  useEffect(() => {
    if (!trackingEnabled()) return;
    captureTouchOnce();
    installRecordEvents();
  }, []);

  useEffect(() => {
    const name = eventForPath(path);
    if (!name) return;
    if (name === 'app_open') appOpenOncePerDay();
    else track(name);
  }, [path]);

  return null;
}
