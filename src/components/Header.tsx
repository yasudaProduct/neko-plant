"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { House, Leaf, LogOut, Wrench } from "lucide-react";
import useUser from "@/hooks/useUser";
import { useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function Header() {
  const { session } = useUser();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(session?.user || null);
  }, [session]);

  return (
    <header className="bg-[#2d5a27] text-primary-foreground p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-medium">
          <Leaf className="w-6 h-6" />
          ネコと植物の相性チェッカー
        </Link>
        {!user ? (
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/signin" className="text-accent-foreground">
              ログイン
            </Link>
          </Button>
        ) : (
          <DropdownMenu
            userImage={user.user_metadata.avatar_url || ""}
            aliasId={user.user_metadata.default_alias_id || ""}
            userName={user.user_metadata.name || ""}
          />
        )}
      </div>
    </header>
  );
}

interface DropdownMenuProps {
  userImage: string;
  aliasId: string;
  userName: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  userImage,
  aliasId,
  userName,
}) => {
  // const router = useRouter();
  const { signOut } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className="focus:outline-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={userImage || undefined} alt={userName || "User"} />
          <AvatarFallback>{userName.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      </button>
      {isOpen && (
        <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-60 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div
            className="py-1"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            <Link legacyBehavior href={"/" + aliasId}>
              <a
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                role="menuitem"
                onClick={handleMenuItemClick}
              >
                <House className="w-6 h-6 mr-2" />
                マイページ確認
              </a>
            </Link>
            <Link legacyBehavior href={"/settings"}>
              <a
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                role="menuitem"
                onClick={handleMenuItemClick}
              >
                <Wrench className="w-6 h-6 mr-2" />
                設定
              </a>
            </Link>
            <button
              onClick={() => {
                signOut();
                handleMenuItemClick();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              role="menuitem"
            >
              <span className=" flex items-center">
                <LogOut className="w-6 h-6 mr-2" />
                ログアウト
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
