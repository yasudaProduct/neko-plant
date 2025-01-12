"use client";

import Link from "next/link";

export default function SettingsLink() {
  return (
    <div className="flex justify-center space-x-4">
      <Link href="/settings/account">アカウント</Link>
      <Link href="/settings/profile">プロフィール</Link>
    </div>
  );
}
