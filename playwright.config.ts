import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  // 操作一連の確認なので、マウス操作とタブレットのタッチ操作の両方で流す
  projects: [
    { name: "desktop (mouse)", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet (touch)", use: { ...devices["iPad (gen 7)"] } },
  ],
  // 静的エクスポート（next.config.ts の output: "export"）なので next start は使えない。
  // ビルド済みの out/ を素の静的サーバーで配信する（事前に `npm run build` が必要）。
  webServer: {
    command: `python3 -m http.server ${PORT} --directory out`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
