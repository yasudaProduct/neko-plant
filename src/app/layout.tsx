import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgressBar from "@/components/ProgressBar";
import { Toaster } from "@/components/ui/toaster";
import { AuthDialogProvider } from "@/contexts/AuthDialogContext";
import { M_PLUS_Rounded_1c } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { headers } from "next/headers";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import JsonLd from "@/components/JsonLd";

const RampartOneFont = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "700"],
  // 日本語グリフはCSSのunicode-range分割で遅延取得されるため、
  // フォント到着までテキストを隠さない (FOIT回避)
  display: "swap",
});

export const metadata: Metadata = {
  // 各ページは title にページ名のみを設定する (「 | 猫と植物」は template が付与)
  title: {
    default: `${SITE_NAME} | 猫にとって安全な植物を探す`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "猫にとって安全な植物を探すためのサイトです。猫と暮らす方々が安心して植物を育てられるように、猫に安全な植物の情報を集めています。",
  keywords: "猫,植物,安全,ペット,観葉植物,猫と暮らす,猫のいる暮らし",
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // title / description / url は各ページの解決済みメタデータから継承させる
  // (固定値を書くと全ページが同一の og:title / og:url になってしまう)
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@neko_plant",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// 運営主体とサイト内検索 (/plants?q=) を機械可読化する
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo.png`,
        width: 500,
        height: 500,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "ja",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/plants?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return (
    <html lang="ja">
      <body className={`${RampartOneFont.className} antialiased`}>
        <JsonLd data={siteJsonLd} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-gray-900 focus:shadow-lg"
        >
          本文へスキップ
        </a>
        <div className="flex flex-col min-h-screen bg-green-50">
          <ProgressBar>
            <AuthDialogProvider>
              <Header />
              <main id="main-content" className="h-full flex-1">{children}</main>
              <Footer />
              <Toaster />
            </AuthDialogProvider>
          </ProgressBar>
        </div>
      </body>
      {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
        <GoogleAnalytics
          gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}
          nonce={nonce}
        />
      )}
    </html>
  );
}
