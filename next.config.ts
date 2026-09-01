import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.join(__dirname);

function resolveAuthUrl() {
  const explicit = (process.env.NEXTAUTH_URL || "").trim().replace(/\/$/, "");
  const onVercel = Boolean(process.env.VERCEL);
  const isLocal =
    !explicit ||
    explicit.includes("localhost") ||
    explicit.includes("127.0.0.1");

  // Never bake localhost into a Vercel build — that makes OAuthSignin fail.
  if (explicit && !isLocal) return explicit;

  if (onVercel) {
    const host = (
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      ""
    ).replace(/^https?:\/\//, "");
    if (host) return `https://${host}`;
  }

  return explicit || "http://localhost:3000";
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
