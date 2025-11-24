/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    dynamicIO: true,
  },
  webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('pdf-parse');
        }
        return config;
    },
};

module.exports = nextConfig;
