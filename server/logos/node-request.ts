// Node IncomingMessage → Web Request (vite dev 미들웨어용). 클라이언트가 보낸 IP 헤더는 믿지 않는다.
import type { IncomingMessage } from "node:http";

const MAX_READ_BYTES = 1024 * 1024;
// authorization을 전달해야 로그인 사용자 요청이 인증된다.
const FORWARDED = ["origin", "referer", "content-type", "authorization"];

export async function toWebRequest(req: IncomingMessage, path = "/api/coach"): Promise<Request> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_READ_BYTES) break; // 핸들러가 64KB 초과를 413으로 거절하므로 메모리만 보호
    chunks.push(chunk as Buffer);
  }
  const headers = new Headers();
  for (const name of FORWARDED) {
    const v = req.headers[name];
    if (typeof v === "string") headers.set(name, v);
  }
  const remote = req.socket?.remoteAddress;
  if (remote) headers.set("x-real-ip", remote);
  const method = req.method ?? "GET";
  return new Request(`http://${req.headers.host ?? "localhost"}${path}`, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks),
  });
}
