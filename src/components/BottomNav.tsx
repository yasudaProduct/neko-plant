"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookHeart,
  Camera,
  Image as ImageIcon,
  Search,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** ログイン済みユーザーの aliasId (未ログイン時は undefined) */
  aliasId?: string;
};

/**
 * モバイル専用の下部固定タブバー。
 * sm以上ではヘッダーナビ (HeaderNav) を使うため表示しない。
 * 中央の「投稿」は未ログインだと middleware が /signin へ誘導する。
 */
export default function BottomNav({ aliasId }: Props) {
  const pathname = usePathname();

  const sideItems = {
    left: [
      { href: "/", label: "フィード", icon: ImageIcon, testId: "bottom-nav-feed", isActive: (p: string) => p === "/" },
      { href: "/zukan", label: "図鑑", icon: BookHeart, testId: "bottom-nav-zukan", isActive: (p: string) => p.startsWith("/zukan") },
    ],
    right: [
      { href: "/plants", label: "さがす", icon: Search, testId: "bottom-nav-search", isActive: (p: string) => p.startsWith("/plants") },
      aliasId
        ? { href: `/${aliasId}`, label: "マイページ", icon: UserRound, testId: "bottom-nav-me", isActive: (p: string) => p === `/${aliasId}` }
        : { href: "/signin", label: "ログイン", icon: UserRound, testId: "bottom-nav-me", isActive: (p: string) => p.startsWith("/signin") },
    ],
  };

  const renderItem = (item: (typeof sideItems.left)[number]) => {
    const active = item.isActive(pathname);
    return (
      <Link
        key={item.href}
        href={item.href}
        data-testid={item.testId}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px]",
          active ? "text-green-700" : "text-gray-500",
        )}
      >
        <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
        <span className={cn("text-[10px] leading-none", active && "font-bold")}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      data-testid="bottom-nav"
      aria-label="メインナビゲーション"
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        {sideItems.left.map(renderItem)}
        {/* 中央の投稿ボタン (主要アクションとして浮かせて強調) */}
        <Link
          href="/posts/new"
          data-testid="bottom-nav-post"
          className="flex flex-col items-center justify-end gap-0.5 py-2 text-gray-500"
        >
          <span className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-green-600 text-white shadow-md border-4 border-green-50">
            <Camera className="w-5 h-5" />
          </span>
          <span className="text-[10px] leading-none">投稿</span>
        </Link>
        {sideItems.right.map(renderItem)}
      </div>
    </nav>
  );
}
