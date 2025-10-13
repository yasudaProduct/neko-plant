import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Construct a strict CSP. In production, avoid 'unsafe-*' for scripts.
const cspHeader = [
  "default-src 'self'",
  `script-src 'self'${isProd ? '' : " 'unsafe-eval' 'unsafe-inline'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' https: wss:${isProd ? '' : ' ws:'}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://confirmed-giant-27d.notion.site",
  "frame-src 'self' https://confirmed-giant-27d.notion.site/ebd/1c69f17f06688007995fc3497043f841",
  "block-all-mixed-content",
  "upgrade-insecure-requests",
].join("; ");

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
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
