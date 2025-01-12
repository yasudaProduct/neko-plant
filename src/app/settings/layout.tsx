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
        <h1 className="text-2xl font-bold mb-6">各種設定</h1>
        <Link href="/settings/account">
          <button
            className={`px-4 py-2 rounded ${
              isActive("/settings/account")
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-white hover:bg-gray-600"
            }`}
          >
            Account
          </button>
        </Link>
        <Link href="/settings/profile">
          <button
            className={`px-4 py-2 rounded ${
              isActive("/settings/profile")
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-white hover:bg-gray-600"
            }`}
          >
            Profile
          </button>
        </Link>
      </div>
      <div className="max-w-4xl mx-auto space-y-8 mt-4 mb-4">
        <div className="bg-white rounded-xl shadow-lg p-6">{children}</div>
      </div>
    </div>
  );
}
