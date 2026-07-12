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

const RampartOneFont = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "700"],
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
        url: "/images/logo.png",
        width: 500,
        height: 500,
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
        <div className="flex flex-col min-h-screen bg-green-50">
          <ProgressBar>
            <AuthDialogProvider>
              <Header />
              <div className="h-full flex-1">{children}</div>
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
