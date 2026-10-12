import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { toWebRequest } from "./server/logos/node-request.js";

// 로컬 개발 전용: /api/coach를 Vercel Function 대신 같은 핸들러로 처리한다.
// env는 Node 쪽에서만 읽는다(define·VITE_ 접두사 금지 — 키가 번들에 들어가면 안 된다).
function coachApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "logos-coach-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/coach", async (req, res) => {
        try {
          const request = await toWebRequest(req);
          const { handleCoach } = (await server.ssrLoadModule("/@fs" + path.resolve(import.meta.dirname, "server/logos/handler.ts"))) as typeof import("./server/logos/handler");
          const response = await handleCoach(request, env);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ code: "unavailable", error: "서버 오류가 발생했어요." }));
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
    host: "127.0.0.1",
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      // Vite 기본 deny 목록을 유지한 채 숨김 파일을 추가로 막는다(대체 금지).
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.*"],
    },
  },
}));
