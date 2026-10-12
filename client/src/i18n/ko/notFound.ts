// 한국어 원문(기준 사전). 키를 추가하면 en/notFound.ts에도 같은 키가 있어야 타입 검사를 통과한다.
export const notFound = {
  title: '페이지를 찾을 수 없어요',
  body1: '찾으시는 페이지가 존재하지 않아요.',
  body2: '주소가 바뀌었거나 삭제됐을 수 있어요.',
  home: '홈으로',
} as const;
