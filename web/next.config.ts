import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Where the API runs. In development and the browser tests, /api/... calls are forwarded there. */
const apiUrl = process.env.API_URL ?? "http://localhost:5216";

const nextConfig: NextConfig = {
  // The browser tests build into their own folder (.next-e2e) so they never disturb your own build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
  // The Docker image runs Next.js's small standalone server (set by web/Dockerfile).
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
