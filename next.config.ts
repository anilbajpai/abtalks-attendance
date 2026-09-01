import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.join(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
