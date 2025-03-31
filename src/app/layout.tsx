import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgressBar from "@/components/ProgressBar";
import { Toaster } from "@/components/ui/toaster";
import { AuthDialogProvider } from "@/contexts/AuthDialogContext";
import { M_PLUS_Rounded_1c } from "next/font/google";

const RampartOneFont = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "猫と植物",
  description: "猫にとって安全な植物を探すためのサイトです。",
  appleWebApp: true,
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
    </html>
  );
}
