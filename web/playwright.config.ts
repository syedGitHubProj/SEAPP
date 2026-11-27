import { defineConfig, devices } from "@playwright/test";

const port = 3100;
export const salesmanState = "e2e/.auth/salesman.json";

/**
 * Browser tests run the real website against the real API on the local PostgreSQL
 * (start it with `docker compose -f deploy/docker-compose.dev.yml up -d`), using a separate
 * `sellease_e2e` database and photo folder so your own local data is never touched.
 * The API's seed-dev command creates the sample staff, customers, factories and designs there.
 * They use their own ports and build (`npm run e2e` builds into .next-e2e), so they run fine
 * while your own API (5216) and website (3000) are running.
 */
const e2eApiEnv = {
  ConnectionStrings__Default: "Host=localhost;Port=5433;Database=sellease_e2e;Username=sellease;Password=sellease_local_dev",
  Photos__LocalPath: "local-photos-e2e",
};
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "phone",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 }, storageState: salesmanState },
      dependencies: ["setup"],
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, storageState: salesmanState },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      // Applies database changes, adds the sample records, then runs the API.
      command:
        "dotnet run --project ../api/src/SellEase.Api -- seed-dev && dotnet run --no-build --project ../api/src/SellEase.Api --launch-profile http -- --urls http://localhost:5317",
      url: "http://localhost:5317/health",
      env: e2eApiEnv,
      // Never reuse an API that might be connected to your own local database.
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      // The production build made by `npm run e2e` in .next-e2e, which sends /api to the test API on 5317.
      command: `npx next start -p ${port}`,
      env: { NEXT_DIST_DIR: ".next-e2e" },
      port,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
