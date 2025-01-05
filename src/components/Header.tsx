"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Leaf, LogOut, Settings } from "lucide-react";
import useUser from "@/hooks/useUser";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function Header() {
  const { user } = useUser();

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
            userImage={user.image || ""}
            aliasId={user.alias_id || ""}
            userName={user.name || ""}
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

const DropdownMenu: React.FC<DropdownMenuProps> = ({ userImage, userName }) => {
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
        className="focus:outline-none flex items-center gap-2"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={userImage || undefined} alt={userName || "User"} />
          <AvatarFallback>{userName.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <span className="text-sm">{userName}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 text-gray-700">
          <Link
            href="/profile"
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100"
            onClick={handleMenuItemClick}
          >
            <Settings className="w-4 h-4" />
            <span>設定</span>
          </Link>
          <button
            onClick={() => {
              signOut();
              handleMenuItemClick();
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
