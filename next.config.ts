import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.jp",
        port: "",
        // pathname: "/640x360.png",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    }
  },
};

export default nextConfig;
