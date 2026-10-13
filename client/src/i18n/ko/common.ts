// 한국어 원문(기준 사전). 키를 추가하면 en/common.ts에도 같은 키가 있어야 타입 검사를 통과한다.
export const common = {
  aiNotice: 'LOGOS 코치는 AI예요. 답이 틀릴 수 있어요.',
  themeLight: '라이트 모드',
  themeDark: '다크 모드',
  themeToggle: '화면 테마 전환',
  langToggle: 'Switch to English',
  langShort: 'EN',
  loading: '불러오는 중…',
  exportNote: '이 파일은 LOGOS 파일럿용 내보내기입니다. 사용자가 직접 쓴 글과 AI 대화 전문이 그대로 들어 있고, 이름·이메일은 포함되지 않습니다. participantId는 이 기기에서 한 번 만든 임의 값입니다. 점수는 AI 추정치이며 사람 채점으로 보정되지 않았습니다.',
  cancel: '취소',
  confirm: '확인',
  save: '저장',
  retry: '다시 시도',
  close: '닫기',
} as const;
