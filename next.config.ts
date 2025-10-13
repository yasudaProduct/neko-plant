import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// 厳密な CSP を構築します。運用環境では、スクリプトに「unsafe-*」を使用しないでください。
const cspHeader = [
  // 規定の許可先 デフォルトのソースを自身のものに制限
  "default-src 'self'",

  // JS読み込み元
  // 本番: 'self' + nonce（middlewareで動的に注入）
  // 開発: 'unsafe-eval' 'unsafe-inline' を許可
  `script-src 'self'${isProd ? '' : " 'unsafe-eval' 'unsafe-inline'"}`,

  // CSS読み込み元
  "style-src 'self' 'unsafe-inline'",

  // 画像読み込み先
  "img-src 'self' data: blob: https:",

  // 通信先
  `connect-src 'self' https: wss:${isProd ? '' : ' ws:'}`,

  // オブジェクト読み込み先
  "object-src 'none'",

  // ベースURI
  "base-uri 'self'",

  // フォームアクション
  "form-action 'self'",

  // フレームアンセスト
  "frame-ancestors 'self' https://confirmed-giant-27d.notion.site",

  // フレームソース
  "frame-src 'self' https://confirmed-giant-27d.notion.site/ebd/1c69f17f06688007995fc3497043f841",

  // HTTP 混在コンテンツの防止と自動 HTTPS 化
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
