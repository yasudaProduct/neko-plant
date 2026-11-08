"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import { LogOut, PawPrint, Settings, SquareUserRound } from "lucide-react";
import { signOut } from "@/lib/supabase/auth-google";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface DropdownMenuProps {
  userImage: string;
  aliasId: string;
  userName: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  userImage,
  userName,
  aliasId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { success, error } = useToast();
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      setIsOpen(false);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleMenuItemClick = () => {
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();

      success({
        title: "ログアウトしました",
      });
      router.push("/");
    } catch {
      error({
        title: "ログアウトに失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      handleMenuItemClick();
    }
  };

  return (
    <div ref={dropdownRef} className="relative z-50">
      <button
        data-testid="user-avatar"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 rounded-full"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Avatar className="size-8">
          <AvatarImage src={userImage || undefined} alt={userName || "User"} />
          <AvatarFallback>{userName.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-ink-secondary hidden md:inline-block truncate max-w-32">{userName}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-popover p-1 text-sm text-ink shadow-[0_8px_24px_rgba(31,27,22,0.08)]">
          <p className="sm:hidden truncate px-3 py-2 text-ink-secondary">{userName}</p>
          <hr className="sm:hidden my-1" />
          <Link
            href={`/${aliasId}`}
            className="flex h-9 items-center gap-2 rounded-md px-3 transition-colors hover:bg-secondary"
            onClick={handleMenuItemClick}
          >
            <SquareUserRound className="size-4 text-ink-muted" strokeWidth={1.5} />
            <span>マイページ</span>
          </Link>
          <Link
            href={`/settings/cats`}
            className="flex h-9 items-center gap-2 rounded-md px-3 transition-colors hover:bg-secondary"
            onClick={handleMenuItemClick}
          >
            <PawPrint className="size-4 text-ink-muted" strokeWidth={1.5} />
            <span>猫プロフィール</span>
          </Link>
          <Link
            href={`/settings/account`}
            className="flex h-9 items-center gap-2 rounded-md px-3 transition-colors hover:bg-secondary"
            onClick={handleMenuItemClick}
          >
            <Settings className="size-4 text-ink-muted" strokeWidth={1.5} />
            <span>設定</span>
          </Link>
          <button
            onClick={async () => {
              await handleSignOut();
            }}
            className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-destructive transition-colors hover:bg-secondary"
          >
            <LogOut className="size-4" strokeWidth={1.5} />
            <span>ログアウト</span>
          </button>
        </div>
      )}
    </div>
  );
};
