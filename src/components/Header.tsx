import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { Camera } from "lucide-react";
import { DropdownMenu } from "./HeaderDropMenu";
import HeaderNav from "./HeaderNav";
import BottomNav from "./BottomNav";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileByAuthId } from "@/actions/user-action";
import { SITE_NAME } from "@/lib/site";

export default async function Header() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = await getUserProfileByAuthId();

  return (
    <>
    <header className="bg-[#2d5a27] text-primary-foreground">
      {/* 幅はホームのヒーロー・フィード (600px + 300px) と左右の端を揃える */}
      <div className="max-w-[964px] mx-auto h-14 px-4 flex items-center gap-2 sm:gap-6">
        {/* ロゴ: 猫と葉のシルエット + サービス名 (alt は空にしてリンク名を「ネコトハ」に保つ) */}
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md">
          <Image
            src="/images/logo.png"
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-full bg-green-100"
            priority
          />
          <span className="text-lg font-medium leading-none whitespace-nowrap">
            {SITE_NAME}
          </span>
        </Link>
        <HeaderNav />
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 min-w-0">
          {!session || !user ? (
            // 主ボタンはページ側 (ヒーローの「投稿をはじめる」) に任せ、ヘッダーは控えめにする
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
              <Link href="/signin" className="text-accent-foreground">
                ログイン
              </Link>
            </Button>
          ) : (
            <>
              {/* モバイルの投稿導線は下部タブバー (BottomNav) 中央に集約 */}
              <Button variant="outline" className="hidden sm:inline-flex" asChild>
                <Link href="/posts/new" className="text-accent-foreground">
                  <Camera className="text-green-500" strokeWidth={1.5} />
                  投稿
                </Link>
              </Button>
              <DropdownMenu
                userImage={user.imageSrc || "/images/logo.png"}
                aliasId={user.aliasId || ""}
                userName={user.name || ""}
              />
            </>
          )}
        </div>
      </div>
    </header>
    {/* fixed配置なのでDOM上はここでよい (プロフィール取得を重複させないためHeaderから渡す) */}
    <BottomNav aliasId={session && user ? user.aliasId || undefined : undefined} />
    </>
  );
}
