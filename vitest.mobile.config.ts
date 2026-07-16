import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: false,
    setupFiles: ["./mobile/test/setup.ts"],
    include: ["mobile/**/*.behavior.test.tsx"],
    restoreMocks: true,
  },
});
