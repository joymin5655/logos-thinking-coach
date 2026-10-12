// 한국어 원문(기준 사전). 키를 추가하면 en/common.ts에도 같은 키가 있어야 타입 검사를 통과한다.
export const common = {
  themeLight: '라이트 모드',
  themeDark: '다크 모드',
  themeToggle: '화면 테마 전환',
  langToggle: 'Switch to English',
  langShort: 'EN',
  loading: '불러오는 중…',
  cancel: '취소',
  confirm: '확인',
  save: '저장',
  retry: '다시 시도',
  close: '닫기',
} as const;
