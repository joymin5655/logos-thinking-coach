import { translate } from '../i18n';
import { loadFields } from './preferences';

/** title·category·context는 현재 언어, field는 분야 매칭용 한국어 키(preferences의 Field). */
export type DailyTopic = {
  id: string;
  title: string;
  category: string;
  field: string;
  context: string;
};

const TOPIC_DEFS = [
  { id: 'd1', field: '기술·사회', cat: 'catTechSociety' },
  { id: 'd2', field: '노동', cat: 'catLabor' },
  { id: 'd3', field: '철학', cat: 'catPhilosophy' },
  { id: 'd4', field: '사회', cat: 'catSociety' },
  { id: 'd5', field: '경제', cat: 'catEconomy' },
  { id: 'd6', field: '라이프스타일', cat: 'catLifestyle' },
  { id: 'd7', field: '커리어', cat: 'catCareer' },
] as const;

type Def = (typeof TOPIC_DEFS)[number];

const localize = (d: Def): DailyTopic => ({
  id: d.id,
  field: d.field,
  title: translate('topics', `${d.id}Title`),
  context: translate('topics', `${d.id}Context`),
  category: translate('topics', d.cat),
});

// 일별 결정적 선택 — 사용자 분야가 있으면 우선 노출, 없으면 전체 풀에서 회전
export function todaysTopic(d: Date = new Date()): DailyTopic {
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  const fields = loadFields();
  const pool = fields.length
    ? TOPIC_DEFS.filter((t) => fields.some((f) => t.field.includes(f) || f.includes(t.field)))
    : TOPIC_DEFS;
  const list = pool.length > 0 ? pool : TOPIC_DEFS;
  return localize(list[dayOfYear % list.length]);
}
