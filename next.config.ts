import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint runs as part of `next build`. If this starts blocking
    // merges, fix the errors rather than flipping this back.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
