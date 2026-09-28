import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "rules",
          include: ["tests/rules/**/*.test.ts"],
          environment: "node",
          testTimeout: 20000,
          hookTimeout: 30000,
          fileParallelism: false,
        },
      },
    ],
  },
});
