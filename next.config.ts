import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@lobehub/icons'],
  reactStrictMode: false, // Disable to avoid double mounting in dev
}

export default nextConfig
