"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, Image as ImageIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "フィード", icon: ImageIcon, isActive: (path: string) => path === "/" },
  { href: "/zukan", label: "図鑑", icon: BookHeart, isActive: (path: string) => path.startsWith("/zukan") },
  { href: "/plants", label: "さがす", icon: Search, isActive: (path: string) => path.startsWith("/plants") },
];

/** ヘッダーのナビゲーション (フィード / 図鑑 / さがす) */
export default function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 ml-2">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            item.isActive(pathname) ? "bg-white/15" : "hover:bg-white/10",
          )}
        >
          <item.icon className="w-4 h-4" />
          <span className="max-sm:hidden">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
