import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: '/archive', destination: '/?app=projects', permanent: true },
      { source: '/pensieve', destination: '/?app=pensieve', permanent: true },
      { source: '/pensieve/tags/:tag*', destination: '/?app=pensieve', permanent: true },
    ];
  },
};

export default nextConfig;
