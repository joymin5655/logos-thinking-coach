/*
 * splitPolicyText — 본문을 [텍스트, 주소, 텍스트, …]로 나눈다(홀수 인덱스가 http(s) 주소).
 * 주소는 공백, 괄호, 따옴표, 」에서 끝나고 끝의 .,;: 는 링크에 넣지 않는다.
 */
const URL_RE = /https?:\/\/[^\s)）"'」]+/g;

export function splitPolicyText(text: string): string[] {
  const out: string[] = [];
  let last = 0;
  for (const m of Array.from(text.matchAll(URL_RE))) {
    const start = m.index ?? 0;
    const url = m[0].replace(/[.,;:]+$/, '');
    out.push(text.slice(last, start), url);
    last = start + url.length;
  }
  out.push(text.slice(last));
  return out;
}
