/*
 * SessionHistory.tsx
 * LOGOS Design: 세션 기록 페이지
 * - 날짜/주제별 필터
 * - 세션 상세 보기
 * - 논리력 스코어 표시
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';

const SESSIONS = [
  {
    id: 1,
    topic: '새 프로젝트 방향성에 대한 고민',
    date: '2026-05-13',
    score: 82,
    level: '통합',
    duration: '23분',
    summary: '프로젝트의 핵심 목표를 명확히 하고, 팀원들과의 소통 방식에 대한 새로운 관점을 발견했습니다.',
    tags: ['업무', '기획', '팀워크'],
  },
  {
    id: 2,
    topic: '팀 내 갈등 해결 방법',
    date: '2026-05-12',
    score: 74,
    level: '본질',
    duration: '18분',
    summary: '갈등의 표면 아래에 있는 근본적인 기대 불일치를 발견했습니다.',
    tags: ['인간관계', '업무', '소통'],
  },
  {
    id: 3,
    topic: '커리어 전환에 대한 불안감',
    date: '2026-05-11',
    score: 68,
    level: '전제',
    duration: '31분',
    summary: '불안감의 원인이 실패에 대한 두려움이 아닌 정체성의 변화에 있음을 인식했습니다.',
    tags: ['커리어', '자기계발', '심리'],
  },
  {
    id: 4,
    topic: '창업 아이디어의 실현 가능성',
    date: '2026-05-09',
    score: 71,
    level: '본질',
    duration: '27분',
    summary: '아이디어의 핵심 가치 제안을 명확히 하고 타겟 고객을 재정의했습니다.',
    tags: ['창업', '기획', '비즈니스'],
  },
  {
    id: 5,
    topic: '학습 방법론에 대한 고민',
    date: '2026-05-07',
    score: 65,
    level: '전제',
    duration: '20분',
    summary: '효율적인 학습보다 깊이 있는 이해가 더 중요하다는 것을 재확인했습니다.',
    tags: ['학습', '자기계발'],
  },
];

const ALL_TAGS = ['전체', '업무', '기획', '인간관계', '커리어', '자기계발', '창업', '심리', '학습'];

const CREAM       = '#F0EBE0';
const CREAM_MID   = 'rgba(240,235,224,0.55)';
const CREAM_DIM   = 'rgba(240,235,224,0.12)';
const CREAM_FAINT = 'rgba(240,235,224,0.06)';
const BLACK       = '#0A0A0A';

export default function SessionHistory() {
  const [, navigate] = useLocation();
  const [selectedTag, setSelectedTag] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = SESSIONS.filter((s) => {
    const matchTag = selectedTag === '전체' || s.tags.includes(selectedTag);
    const matchSearch = !searchQuery || s.topic.includes(searchQuery) || s.summary.includes(searchQuery);
    return matchTag && matchSearch;
  });

  return (
    <DashboardLayout title="세션 기록" titleEn="History">
      {/* Search & Filter */}
      <div className="mb-8">
        <div
          className="flex items-center gap-3 pb-4 mb-4"
          style={{ borderBottom: `1px solid ${CREAM_DIM}` }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
            <circle cx="6" cy="6" r="4.5" stroke={CREAM} strokeWidth="1.2" />
            <path d="M9.5 9.5L12 12" stroke={CREAM} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="세션 검색..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: CREAM }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ color: CREAM_MID, opacity: 0.6 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '7px',
                letterSpacing: '0.12em',
                padding: '4px 10px',
                backgroundColor: selectedTag === tag ? CREAM : 'transparent',
                color: selectedTag === tag ? BLACK : CREAM_MID,
                border: `1px solid ${selectedTag === tag ? CREAM : CREAM_DIM}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Session Count */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: '16px' }}>
        {filtered.length}개의 세션
      </div>

      {/* Session List */}
      <div>
        {filtered.map((session, i) => (
          <div key={session.id} style={{ borderTop: `1px solid ${CREAM_DIM}` }}>
            <button
              onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              className="w-full flex items-start justify-between py-5 text-left transition-colors"
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = CREAM_FAINT; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div className="flex items-start gap-6">
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, width: '20px', flexShrink: 0, marginTop: '2px' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, color: CREAM, marginBottom: '5px' }}>
                    {session.topic}
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID }}>{session.date}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID }}>{session.duration}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.1em', padding: '2px 6px', backgroundColor: CREAM_FAINT, color: CREAM_MID }}>
                      {session.level} 단계
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '20px', fontWeight: 600, color: CREAM }}>
                  {session.score}
                </div>
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ opacity: 0.3, transform: expandedId === session.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                >
                  <path d="M4 2L8 6L4 10" stroke={CREAM} strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            </button>

            {expandedId === session.id && (
              <div className="pb-6 pl-11">
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM_MID, lineHeight: 1.9, marginBottom: '14px' }}>
                  {session.summary}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {session.tags.map((tag) => (
                    <span key={tag} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.1em', padding: '3px 8px', backgroundColor: CREAM_FAINT, color: CREAM_MID }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4">
                  <button
                    style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase', color: CREAM_MID, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                    onClick={() => navigate('/dashboard/analytics')}
                  >
                    분석 보기 →
                  </button>
                  <button
                    style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase', color: CREAM_MID, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.35'; }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${CREAM_DIM}` }} />
      </div>
    </DashboardLayout>
  );
}
