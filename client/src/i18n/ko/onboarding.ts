// 한국어 원문(기준 사전). 키를 추가하면 en/onboarding.ts에도 같은 키가 있어야 타입 검사를 통과한다.
export const onboarding = {
  title: '시작하기',
  description: '진단부터 첫 논증까지 안내해요.',
  later: '나중에 하기',
  stepsLabel: '시작 단계',
  stepDiagnostic: '01 진단',
  stepInterests: '02 관심',
  stepArgue: '03 첫 논증',
  stepReminder: '04 캘린더',
  stepDone: '완료',

  diagTitle: '3분 글쓰기로 지금의 기준점을 만들어요',
  diagLead: '주제 하나에 짧게 쓰면 논리 일관성·근거·방어 세 축으로 점수가 나와요. 28일 뒤 같은 방식으로 다시 재서 얼마나 달라졌는지 보여 드려요.',
  diagStart: '3분 진단 시작',
  baselineLabel: '오늘 만든 기준점',
  baselineSub: '28일 뒤 다시 재서 비교해 드려요',

  interestsTitle: '어떤 주제로 매일 생각해 볼까요?',
  interestsLead: '고른 분야에서 오늘의 논증 주제가 나와요. 최대 3개, 나중에 설정에서 바꿀 수 있어요.',
  fieldsLegend: '관심 분야',
  nextCount: '{n}개 선택 · 다음',
  nextNone: '분야를 골라 주세요',
  skip: '건너뛰기',

  argueTitle: '첫 번째 논증을 시작해 볼까요?',
  argueLead: '입장을 고르고 근거를 쓰면, LOGOS가 가장 약한 고리를 세 번 물어요. 10분이면 돼요.',
  argueStart: '오늘의 논증 시작',

  reminderTitle: '내일 아침에도 이어서 생각해요',
  reminderLead: '내일 오전 8시에 오늘의 논증을 알려 주는 일정을 캘린더에 넣을 수 있어요.',
  reminderAdd: '캘린더에 넣기',

  nextPreview: '다음 단계 미리보기',
  nextArgueTitle: '다음 · 첫 오늘의 논증 10분',
  nextArgueBody: '입장을 고르고 근거를 쓰면, LOGOS가 가장 약한 고리를 세 번 물어요. 마치면 내일 아침 일정을 캘린더에 넣을 수 있어요.',
} as const;
