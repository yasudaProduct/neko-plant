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
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] transition-colors",
          active ? "text-primary" : "text-ink-muted",
        )}
      >
        <item.icon className="size-5" strokeWidth={active ? 2 : 1.5} />
        <span className={cn("text-[11px] leading-none", active && "font-medium")}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      data-testid="bottom-nav"
      aria-label="メインナビゲーション"
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        {sideItems.left.map(renderItem)}
        {/* 中央の投稿ボタン (主要アクションとして浮かせて強調) */}
        <Link
          href="/posts/new"
          data-testid="bottom-nav-post"
          className="flex flex-col items-center justify-end gap-1 py-2 text-ink-muted"
        >
          <span className="flex items-center justify-center size-12 -mt-6 rounded-full bg-primary text-primary-foreground shadow-sm border-4 border-background">
            <Camera className="size-5" strokeWidth={1.5} />
          </span>
          <span className="text-[11px] leading-none">投稿</span>
        </Link>
        {sideItems.right.map(renderItem)}
      </div>
    </nav>
  );
}
