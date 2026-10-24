const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:8357",
    viewport: { width: 1500, height: 960 },
    locale: "zh-CN",
    trace: "retain-on-failure",
    launchOptions: process.env.BROWSER_PATH
      ? { executablePath: process.env.BROWSER_PATH }
      : {},
  },
  webServer: {
    command: (process.env.TEST_PYTHON || "python") + " tests/browser/serve.py",
    url: "http://127.0.0.1:8357/healthz",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
