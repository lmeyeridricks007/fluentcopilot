import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      {
        source: '/app/practice/scenario/supermarket',
        destination: '/app/practice/scenario/supermarket_shop',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
