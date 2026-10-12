import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { toWebRequest } from "../node-request";

function fakeReq(headers: Record<string, string>, body: string, remote = "10.0.0.5"): IncomingMessage {
  const r = Readable.from([Buffer.from(body)]) as unknown as IncomingMessage;
  Object.assign(r, { headers: { host: "localhost:3000", ...headers }, method: "POST", socket: { remoteAddress: remote } });
  return r;
}

describe("toWebRequest", () => {
  it("ignores client x-forwarded-for / x-real-ip and uses the socket address", async () => {
    const r = await toWebRequest(fakeReq({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "7.7.7.7", origin: "http://localhost:3000", "content-type": "application/json" }, "{}"));
    expect(r.headers.get("x-real-ip")).toBe("10.0.0.5");
    expect(r.headers.get("x-forwarded-for")).toBeNull();
    expect(r.headers.get("origin")).toBe("http://localhost:3000");
  });

  it("forwards authorization and the body", async () => {
    const r = await toWebRequest(fakeReq({ authorization: "Bearer abc", "content-type": "application/json" }, '{"a":1}'));
    expect(r.headers.get("authorization")).toBe("Bearer abc");
    expect(await r.json()).toEqual({ a: 1 });
    expect(new URL(r.url).pathname).toBe("/api/coach");
  });
});
