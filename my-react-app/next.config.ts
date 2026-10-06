import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/serpapi/:path*',
        destination: 'https://serpapi.com/:path*',
      },
    ]
  },
}

export default nextConfig