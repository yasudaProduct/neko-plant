"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Leaf } from "lucide-react";
// import { UserResponse } from "@supabase/supabase-js";
import { DropdownMenu } from "./HeaderDropMenu";
import useUser from "@/hooks/useUser";

export default function Header() {
  const { user } = useUser();
  // const supabase = await createClient();
  // const {
  //   data: { user },
  //   error,
  // }: UserResponse = await supabase.auth.getUser();

  // if (error) {
  //   console.log("Header: error⇩");
  //   console.log(error);
  //   console.log("Header: error↑");
  // }

  // console.log("Header: user", user);

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
