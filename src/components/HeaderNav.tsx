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

/** ヘッダーのナビゲーション (フィード / 図鑑 / さがす)。モバイルは BottomNav に移管 */
export default function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="max-sm:hidden flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-secondary text-ink"
                : "text-ink-secondary hover:bg-secondary hover:text-ink",
            )}
          >
            <item.icon className="size-4" strokeWidth={1.5} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
