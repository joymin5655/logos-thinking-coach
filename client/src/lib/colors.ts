/*
 * colors.ts — LOGOS 데이터 시각화 팔레트
 *
 * 3 layer:
 *   - CHART_CATEGORICAL  : 카테고리/필드 구분 (9색, earth tones)
 *   - RANK_SEQUENTIAL    : 랭크 9단계 그라데이션 (재 → 금)
 *   - SEMANTIC           : 승패/상태 의미
 *
 * 채도 55-75% / 명도 55-65% — 다크 BG에서 또렷이 떠 보이며 다양성 확보.
 * 색맹(deuteranopia/protanopia) 친화: 적·녹 직접 대비 회피, 명도로도 구분.
 */
import type { Field } from './preferences';

// ── Categorical (카테고리/필드용 9색) ──
export const CHART_CATEGORICAL: string[] = [
  '#E0B84A', // 1 Vivid Gold      (기존 ACCENT 채도 ↑)
  '#E07350', // 2 Vivid Terra
  '#F2A21E', // 3 Bright Ochre
  '#C265B8', // 4 Vivid Plum
  '#4FA8DC', // 5 Bright Sky
  '#E8552E', // 6 Hot Rust
  '#8FCC4C', // 7 Lime Sage
  '#D4D43E', // 8 Bright Olive
  '#3FB4D6', // 9 Cyan Slate
];

// Field name → 색 고정 매핑 (preferences.ts ALL_FIELDS 순서와 일치)
export const FIELD_COLOR: Record<Field, string> = {
  '기술·사회':    CHART_CATEGORICAL[0],
  '사회':         CHART_CATEGORICAL[1],
  '경제':         CHART_CATEGORICAL[2],
  '철학':         CHART_CATEGORICAL[3],
  '윤리':         CHART_CATEGORICAL[4],
  '노동':         CHART_CATEGORICAL[5],
  '커리어':       CHART_CATEGORICAL[6],
  '라이프스타일': CHART_CATEGORICAL[7],
  '교육':         CHART_CATEGORICAL[8],
};

// ── Sequential (랭크 9단계 그라데이션) ──
// Lv.1 어두운 청동 → Lv.5 골드 → Lv.9 highlight gold (채도 ↑)
export const RANK_SEQUENTIAL: string[] = [
  '#6B4A2E', // Lv.1 수련자   bronze
  '#8C6438', // Lv.2 질문자
  '#B07F3E', // Lv.3 논증가
  '#CC9A3E', // Lv.4 회의자
  '#E0B84A', // Lv.5 변증가   gold
  '#EFC847', // Lv.6 비판자
  '#F5D74E', // Lv.7 해석자
  '#FBE56A', // Lv.8 사색가
  '#FFF08A', // Lv.9 소피스트 highlight
];

// ── Semantic (의미 부여) ──
export const SEMANTIC = {
  win:     '#8FCC4C', // lime green — WIN / 통찰
  draw:    '#E0B84A', // gold       — DRAW / 중립 (ACCENT)
  lose:    '#E8552E', // hot rust   — LOSE / 오류
  insight: '#F5D74E', // highlight  — 강조
  warning: '#F2A21E', // bright ochre — 주의
  info:    '#4FA8DC', // sky blue   — 정보
} as const;

// 점수(0-100) → 색상 매핑
export function scoreColor(score: number): string {
  if (score < 50) return SEMANTIC.lose;
  if (score < 65) return SEMANTIC.warning;
  if (score < 80) return SEMANTIC.draw;
  return SEMANTIC.win;
}

// 랭크 레벨(1-9) → 색상
export function rankColor(lv: number): string {
  const i = Math.max(1, Math.min(9, lv)) - 1;
  return RANK_SEQUENTIAL[i];
}

// ── Light-theme variants (크림 #F0EBE0 위에서 가독성 확보) ──
// 다크 SEMANTIC을 명도 낮춘 deep tone. 흰/크림 BG에서 충분한 대비.
export const SEMANTIC_DARK = {
  win:     '#3F7A2A', // deep sage
  draw:    '#8A5E1A', // deep gold/brown
  lose:    '#B23A1F', // deep terra
  insight: '#8A6A18', // mustard
  warning: '#9C5A0E', // deep ochre
  info:    '#1F5F88', // deep slate
} as const;

// Light bg용 categorical (8색, 어둠게)
export const CATEGORICAL_DARK: string[] = [
  '#8A5E1A', // deep gold
  '#B23A1F', // deep terra
  '#9C5A0E', // deep ochre
  '#724273', // deep plum
  '#1F5F88', // deep slate
  '#A53412', // deep rust
  '#3F7A2A', // deep sage
  '#75751F', // deep olive
];
