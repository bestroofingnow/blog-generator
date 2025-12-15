// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.marblism.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
  },
  env: {
    // API keys will be loaded from .env.local
  },
  api: {
    responseLimit: "10mb",
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
