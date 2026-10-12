import { loadFields } from './preferences';

export type DailyTopic = {
  id: string;
  title: string;
  category: string;
  context: string;
};

export const DAILY_TOPICS: DailyTopic[] = [
  { id: 'd1', title: 'AI가 인간의 창의성을 위협하는가', category: '기술·사회', context: '생성형 AI가 창작 영역에 깊이 침투한 지금, 인간 고유의 창의성은 어떻게 정의되어야 할까요.' },
  { id: 'd2', title: '주 4일제는 생산성을 높이는가', category: '노동',     context: '근무일 단축이 단기 휴식 효과인지, 장기 구조적 변화인지에 대한 논쟁이 진행 중입니다.' },
  { id: 'd3', title: '재능과 노력 중 무엇이 더 중요한가', category: '철학',  context: '성공의 본질에 대한 고전적 논쟁. 어느 쪽이 더 결정적이라고 보십니까.' },
  { id: 'd4', title: '소셜 미디어는 민주주의에 도움이 되는가', category: '사회', context: '연결과 분열, 여론과 알고리즘 — 양면적 영향이 동시에 관찰됩니다.' },
  { id: 'd5', title: '베이직 인컴은 실현 가능한 정책인가', category: '경제',     context: '재원, 인센티브, 사회적 영향. 단순 분배론을 넘어선 시각이 필요합니다.' },
  { id: 'd6', title: '디지털 디톡스는 효과가 있는가', category: '라이프스타일', context: '의지의 문제인지 환경 설계의 문제인지, 논거를 정리해 보세요.' },
  { id: 'd7', title: '평생 직장 개념은 사라졌는가', category: '커리어',         context: '안정성과 유연성의 트레이드오프. 세대별 인식 차이도 고려해야 합니다.' },
];

// 일별 결정적 선택 — 사용자 분야가 있으면 우선 노출, 없으면 전체 풀에서 회전
export function todaysTopic(d: Date = new Date()): DailyTopic {
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  const fields = loadFields();
  const pool = fields.length
    ? DAILY_TOPICS.filter((t) => fields.some((f) => t.category.includes(f) || f.includes(t.category)))
    : DAILY_TOPICS;
  const list = pool.length > 0 ? pool : DAILY_TOPICS;
  return list[dayOfYear % list.length];
}
