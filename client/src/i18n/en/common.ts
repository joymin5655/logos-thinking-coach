import type { common as Ko } from '../ko/common';

export const common: Record<keyof typeof Ko, string> = {
  themeLight: 'Light mode',
  themeDark: 'Dark mode',
  themeToggle: 'Toggle color theme',
  langToggle: '한국어로 보기',
  langShort: '한',
  loading: 'Loading…',
  exportNote: 'This is a LOGOS pilot export. It contains the text you wrote and the full AI conversations as-is, and does not include your name or email. participantId is a random value generated once on this device. Scores are AI estimates and have not been calibrated by human raters.',
  cancel: 'Cancel',
  confirm: 'OK',
  save: 'Save',
  retry: 'Try again',
  close: 'Close',
};
