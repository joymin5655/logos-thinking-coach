// Vercel Function (Web 표준 시그니처). 로직은 server/logos/handler.ts에 있다.
// 상대 경로 + `.js` 확장자: api/는 tsconfig 경로 별칭이 안 먹고, package.json이 "type":"module"이라
// Node ESM이 확장자 없는 specifier를 못 푼다. tsconfig(moduleResolution: bundler)는 `.js`를 `.ts`로 해석한다.
import { handleCoach } from "../server/logos/handler.js";

export default {
  async fetch(request: Request) {
    return handleCoach(request, process.env);
  },
};
