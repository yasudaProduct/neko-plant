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
    // 各設定ページが自前でカードを持っているため、レイアウト側は
    // 見出しとタブだけを担当する (白カードの二重掛けを避ける)
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-12 flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">各種設定</h1>

      {/* ラベルが語中で折り返さないよう nowrap にし、入り切らない幅では横スクロールさせる */}
      <div className="flex items-center border-b border-border overflow-x-auto">
        {[
          { href: "/settings/account", label: "アカウント" },
          { href: "/settings/profile", label: "プロフィール" },
          { href: "/settings/cats", label: "猫プロフィール" },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm transition-colors ${
              isActive(tab.href)
                ? "text-gray-900 font-semibold border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
