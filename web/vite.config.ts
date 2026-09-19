import { defineConfig } from "vitest/config";

// The lab writes what the browser needs to data/built/web; the page serves that folder as its public root.
// The codec is imported straight from contracts/, which is why the dev server may read one level up.
export default defineConfig({
  appType: "mpa", // one page and no client routes: a missing brain.cloud is a 404, not index.html with status 200
  publicDir: "../data/built/web",
  server: { port: 5173, strictPort: true, fs: { allow: [".."] } },
  test: { include: ["tests/**/*.test.ts"] },
});
