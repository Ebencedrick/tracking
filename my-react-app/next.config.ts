import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/serpapi/:path*',
        destination: 'https://serpapi.com/:path*',
      },
      {
        source: '/api/:path*',
        destination: `${process.env.API_PROXY_TARGET || 'http://localhost:5000'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig