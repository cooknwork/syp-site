import type { NextConfig } from 'next';

// Stages 2–4 run without a server: the site is exported as static files.
// Stage 5 (admin + database) switches this to a server build.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
};

export default nextConfig;
