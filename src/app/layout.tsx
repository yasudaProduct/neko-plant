import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgressBar from "@/components/ProgressBar";
import { Toaster } from "@/components/ui/toaster";
import { AuthDialogProvider } from "@/contexts/AuthDialogContext";
import { M_PLUS_Rounded_1c } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";

const RampartOneFont = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "猫と植物 | 猫にとって安全な植物を探す",
  description:
    "猫にとって安全な植物を探すためのサイトです。猫と暮らす方々が安心して植物を育てられるように、猫に安全な植物の情報を集めています。",
  keywords: "猫,植物,安全,ペット,観葉植物,猫と暮らす,猫のいる暮らし",
  authors: [{ name: "猫と植物" }],
  creator: "猫と植物",
  publisher: "猫と植物",
  metadataBase: new URL("https://neko-and-plant.com"),
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://neko-and-plant.com",
    siteName: "猫と植物",
    title: "猫と植物 | 猫にとって安全な植物を探す",
    description:
      "猫にとって安全な植物を探すためのサイトです。猫と暮らす方々が安心して植物を育てられるように、猫に安全な植物の情報を提供しています。",
    images: [
      {
        url: "images/logo.png",
        width: 1200,
        height: 630,
        alt: "猫と植物",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "猫と植物 | 猫にとって安全な植物を探す",
    description:
      "猫にとって安全な植物を探すためのサイトです。猫と暮らす方々が安心して植物を育てられるように、猫に安全な植物の情報を提供しています。",
    images: ["images/logo.png"],
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
  alternates: {
    canonical: "https://neko-and-plant.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
      )}
    </html>
  );
}
