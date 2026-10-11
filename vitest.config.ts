import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "test/**/*.test.{ts,mjs}",
    ],
    setupFiles: ["test/no-network.setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 2,
    testTimeout: 5000,
  },
});
