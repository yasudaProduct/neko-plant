"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Leaf } from "lucide-react";
import { DropdownMenu } from "./HeaderDropMenu";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export default function Header() {
  // const { user } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  const getCurrentUser = async () => {
    // ログインのセッションを取得する処理
    const { data } = await supabase.auth.getSession();

    // セッションがあるときだけ現在ログインしているユーザーを取得する
    if (data.session !== null) {
      // supabaseに用意されている現在ログインしているユーザーを取得する関数
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // currentUserにユーザーのメールアドレスを格納
      setUser(user);
    }
  };

  useEffect(() => {
    getCurrentUser();
    console.log("Header: useEffect user", user);
  }, []);

  return (
    <header className="bg-[#2d5a27] text-primary-foreground p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-medium">
          <Leaf className="w-6 h-6" />
          猫と植物
        </Link>
        <div className="flex items-center gap-2">
          {!user ? (
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/signin" className="text-accent-foreground">
                ログイン
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="outline">
                <Link href="/plants/new" className="text-accent-foreground">
                  植物を追加
                </Link>
              </Button>
              <DropdownMenu
                userImage={user.user_metadata.image_url || ""}
                aliasId={user.user_metadata.alias_id || ""}
                userName={user.user_metadata.name || ""}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
