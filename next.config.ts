import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // プレースホルダー画像
      {
        protocol: "https",
        hostname: "placehold.jp",
        port: "",
      },
      // Supabase ストレージ（開発環境）
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      // Supabase ストレージ（本番環境）
      {
        protocol: "https",
        hostname: "zywckgouytajnciajkhk.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  /**
   * 共通レスポンスヘッダ
   * @returns レスポンスヘッダ
   * 
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          }
        ],
      },
    ];
  },
};

export default nextConfig;
