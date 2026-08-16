"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div>
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        <div className="max-w-4xl mx-auto space-y-8 mt-4 mb-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6">各種設定</h1>
            {/* ラベルが語中で折り返さないよう nowrap にし、入り切らない幅では横スクロールさせる */}
            <div className="flex items-center gap-2 mb-4 border-b overflow-x-auto">
              {[
                { href: "/settings/account", label: "アカウント" },
                { href: "/settings/profile", label: "プロフィール" },
                { href: "/settings/cats", label: "猫プロフィール" },
              ].map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm ${
                    isActive(tab.href)
                      ? "text-black border-b-2 border-green-500"
                      : "text-black hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
