import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["server/**/__tests__/*.test.ts", "shared/**/__tests__/*.test.ts", "client/src/**/__tests__/*.test.ts", "supabase/tests/*.test.ts"] },
});
