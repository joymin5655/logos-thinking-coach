import { common } from './common';
import { nav } from './nav';
import { auth } from './auth';
import { settings } from './settings';
import { privacy } from './privacy';
import { pricing } from './pricing';
import { arena } from './arena';
import { admin } from './admin';
import { landing } from './landing';
import { about } from './about';
import { features } from './features';
import { dashboard } from './dashboard';
import { analytics } from './analytics';
import { history } from './history';
import { session } from './session';
import { argue } from './argue';
import { diagnostic } from './diagnostic';
import { errors } from './errors';
import { marketing } from './marketing';
import { topics } from './topics';
import { ics } from './ics';
import { notFound } from './notFound';
import { meta } from './meta';

// 네임스페이스 목록은 여기서만 고정한다. 페이지 작업은 각자의 ko/<ns>.ts·en/<ns>.ts만 수정한다.
export const ko = { common, nav, auth, settings, privacy, pricing, arena, admin, landing, about, features, dashboard, analytics, history, session, argue, diagnostic, errors, marketing, topics, ics, notFound, meta };
export type Dict = typeof ko;
