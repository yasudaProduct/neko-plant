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
            <div className="flex items-center gap-2 mb-4 border-b">
              <Link href="/settings/account">
                <button
                  className={`px-4 py-2 ${
                    isActive("/settings/account")
                      ? "text-black border-b-2 border-green-500"
                      : "text-black hover:text-gray-600"
                  }`}
                >
                  アカウント
                </button>
              </Link>
              <Link href="/settings/profile">
                <button
                  className={`px-4 py-2 ${
                    isActive("/settings/profile")
                      ? "text-black border-b-2 border-green-500"
                      : "text-black hover:text-gray-600"
                  }`}
                >
                  プロフィール
                </button>
              </Link>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
