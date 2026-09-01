import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.join(__dirname);

// NextAuth's SessionProvider calls `new URL(NEXTAUTH_URL)` at module load.
// An empty string (common on Vercel if the env var exists but has no value)
// throws during prerender of `/_not-found` and fails the build.
function resolveAuthUrl() {
  const explicit = process.env.NEXTAUTH_URL;
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: resolveAuthUrl(),
  },
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
