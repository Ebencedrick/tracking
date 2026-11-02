import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
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