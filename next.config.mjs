/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "eu-images.contentstack.com",
      },
      {
        hostname: "images.contentstack.io",
      },
      {
        // Generic pattern for all development and staging environments
        protocol: "https",
        hostname: "*-images.csnonprod.com",
      },
    ],
  },
};

export default nextConfig;
