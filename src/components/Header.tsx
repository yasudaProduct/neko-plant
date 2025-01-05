"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Leaf } from "lucide-react";
import useUser from "@/hooks/useUser";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function Header() {
  const { session, signOut } = useUser();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(session?.user || null);
    console.log("session", session);
    console.log("user", user);
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
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={signOut}
          >
            ログアウト
          </Button>
        )}
      </div>
    </header>
  );
}
