/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      }
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback };
    return config;
  },
  async rewrites() {
    const backendBase = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendBase}/uploads/:path*`,
      },
    ];
  },
}

module.exports = nextConfig;

