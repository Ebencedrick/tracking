import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    const localApiRewrite = process.env.NODE_ENV === 'development'
      ? [{
          source: '/api/:path*',
          destination: `${process.env.API_PROXY_TARGET || 'http://localhost:5000'}/api/:path*`,
        }]
      : []

    return [
      {
        source: '/api/serpapi/:path*',
        destination: 'https://serpapi.com/:path*',
      },
      ...localApiRewrite,
    ]
  },
}

export default nextConfig