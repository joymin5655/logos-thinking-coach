import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

// 로컬 개발 전용: /api/coach를 Vercel Function 대신 같은 핸들러로 처리한다.
// env는 Node 쪽에서만 읽는다(define·VITE_ 접두사 금지 — 키가 번들에 들어가면 안 된다).
function coachApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "logos-coach-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/coach", async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 1024 * 1024) break; // 핸들러가 64KB 초과를 413으로 거절하므로 메모리만 보호
            chunks.push(chunk as Buffer);
          }
          const headers = new Headers();
          for (const name of ["origin", "referer", "content-type"]) {
            const v = req.headers[name];
            if (typeof v === "string") headers.set(name, v);
          }
          headers.set("x-forwarded-for", String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? ""));
          const method = req.method ?? "GET";
          const request = new Request(`http://${req.headers.host ?? "localhost"}/api/coach`, {
            method,
            headers,
            body: method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks),
          });
          const { handleCoach } = (await server.ssrLoadModule("/@fs" + path.resolve(import.meta.dirname, "server/logos/handler.ts"))) as typeof import("./server/logos/handler");
          const response = await handleCoach(request, env);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "서버 오류가 발생했어요." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), coachApiPlugin(loadEnv(mode, process.cwd(), ""))],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
