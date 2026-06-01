/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid filesystem pack-cache ENOENT race on macOS that causes
      // unhandledRejection crashes and hot-reload loops.
      config.cache = { type: 'memory' };
    }
    return config;
  },
}

module.exports = nextConfig
