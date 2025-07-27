"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import { LogOut, Settings, SquareUserRound } from "lucide-react";
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
        className="focus:outline-none flex items-center gap-2"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={userImage || undefined} alt={userName || "User"} />
          <AvatarFallback>{userName.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <span className="text-sm max-sm:hidden">{userName}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 text-gray-700">
          <div className="flex items-center gap-2 space-x-2 px-4 py-2">
            <span className="sm:hidden">{userName}</span>
          </div>
          <hr className="sm:hidden" />
          <Link
            href={`/${aliasId}`}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100"
            onClick={handleMenuItemClick}
          >
            <SquareUserRound className="w-4 h-4" />
            <span>マイページ</span>
          </Link>
          <Link
            href={`/settings/account`}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100"
            onClick={handleMenuItemClick}
          >
            <Settings className="w-4 h-4" />
            <span>設定</span>
          </Link>
          <button
            onClick={async () => {
              await handleSignOut();
            }}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-red-600"
          >
            <LogOut className="w-4 h-4" />
            <span>ログアウト</span>
          </button>
        </div>
      )}
    </div>
  );
};
