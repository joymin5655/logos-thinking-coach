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
          className="flex items-center gap-3 border-b pb-4 mb-4"
          style={{ borderColor: 'rgba(44,44,30,0.12)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
            <circle cx="6" cy="6" r="4.5" stroke="#1E1E14" strokeWidth="1.2" />
            <path d="M9.5 9.5L12 12" stroke="#1E1E14" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="세션 검색..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{
              fontFamily: 'Outfit, sans-serif',
              color: '#1E1E14',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="opacity-40 hover:opacity-70"
              style={{ color: '#1E1E14' }}
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
              className="px-3 py-1 text-xs tracking-[0.1em] transition-all duration-150"
              style={{
                fontFamily: 'Outfit, sans-serif',
                backgroundColor: selectedTag === tag ? '#1E1E14' : 'transparent',
                color: selectedTag === tag ? '#C5C9B4' : 'rgba(44,44,30,0.5)',
                border: '1px solid',
                borderColor: selectedTag === tag ? '#1E1E14' : 'rgba(44,44,30,0.2)',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Session Count */}
      <div
        className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-4"
        style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
      >
        {filtered.length}개의 세션
      </div>

      {/* Session List */}
      <div className="space-y-0">
        {filtered.map((session, i) => (
          <div
            key={session.id}
            className="border-t"
            style={{ borderColor: 'rgba(44,44,30,0.12)' }}
          >
            <button
              onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              className="w-full flex items-start justify-between py-5 text-left hover:bg-[rgba(44,44,30,0.02)] transition-colors"
            >
              <div className="flex items-start gap-6">
                <span
                  className="text-xs opacity-25 w-5 shrink-0 mt-0.5"
                  style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14', fontWeight: 600 }}
                  >
                    {session.topic}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs opacity-40"
                      style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                    >
                      {session.date}
                    </span>
                    <span
                      className="text-xs opacity-40"
                      style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                    >
                      {session.duration}
                    </span>
                    <span
                      className="text-[0.6rem] tracking-[0.1em] px-2 py-0.5"
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        backgroundColor: 'rgba(44,44,30,0.06)',
                        color: 'rgba(44,44,30,0.6)',
                      }}
                    >
                      {session.level} 단계
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#EF9F27' }}
                >
                  {session.score}
                </div>
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{
                    opacity: 0.3,
                    transform: expandedId === session.id ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <path d="M4 2L8 6L4 10" stroke="#1E1E14" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            </button>

            {/* Expanded Detail */}
            {expandedId === session.id && (
              <div
                className="pb-6 pl-11"
                style={{ animation: 'fade-in-up 0.3s ease forwards' }}
              >
                <p
                  className="text-sm opacity-60 mb-4 leading-relaxed"
                  style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14', lineHeight: 1.8 }}
                >
                  {session.summary}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {session.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[0.6rem] tracking-[0.1em] px-2 py-1"
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        backgroundColor: 'rgba(44,44,30,0.06)',
                        color: 'rgba(44,44,30,0.5)',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    className="text-xs tracking-[0.15em] uppercase opacity-50 hover:opacity-80 transition-opacity"
                    style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                    onClick={() => navigate('/dashboard/analytics')}
                  >
                    분석 보기 →
                  </button>
                  <button
                    className="text-xs tracking-[0.15em] uppercase opacity-30 hover:opacity-60 transition-opacity"
                    style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="border-t" style={{ borderColor: 'rgba(44,44,30,0.12)' }} />
      </div>
    </DashboardLayout>
  );
}
