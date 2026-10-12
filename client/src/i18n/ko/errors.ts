// 한국어 원문(기준 사전). 키를 추가하면 en/errors.ts에도 같은 키가 있어야 타입 검사를 통과한다.
// 키는 /api/coach 오류 코드(docs/API_CONTRACT.md)와 같다.
export const errors = {
  auth: '로그인이 필요해요. 로그인 화면으로 이동합니다.',
  quota: '오늘 한도를 다 썼어요. 내일 다시 이용할 수 있어요.',
  rate: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  upstream: 'AI 응답을 받지 못했어요. 다시 시도해 주세요.',
  unavailable: '서비스를 준비 중이에요. 잠시 후 다시 시도해 주세요.',
  origin: '이 주소에서는 사용할 수 없어요. lo9os.org에서 다시 열어 주세요.',
  bad_request: '입력을 처리하지 못했어요. 내용을 조금 줄이거나 다시 써 보세요.',
  timeout: 'AI 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
  network: '네트워크 연결을 확인해 주세요.',
} as const;
