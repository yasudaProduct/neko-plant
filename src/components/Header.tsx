import Link from "next/link";
import { Button } from "./ui/button";
import { Camera, Leaf, PawPrint } from "lucide-react";
import { DropdownMenu } from "./HeaderDropMenu";
import HeaderNav from "./HeaderNav";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileByAuthId } from "@/actions/user-action";

export default async function Header() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = await getUserProfileByAuthId();

  return (
    <header className="bg-[#2d5a27] text-primary-foreground p-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center gap-1 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 sm:gap-2 text-xl max-sm:text-base font-medium whitespace-nowrap"
          >
            <PawPrint className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            猫と植物
            <Leaf className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          </Link>
          <span className="text-xs text-green-200 max-sm:hidden">Beta Version</span>
        </div>
        <HeaderNav />
        <div className="flex-1"></div>
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          {!session || !user ? (
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90 max-sm:px-3 max-sm:h-8 max-sm:text-xs"
              asChild
            >
              <Link href="/signin" className="text-accent-foreground">
                ログイン
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" className="w-10 h-10 sm:hidden" asChild>
                <Link href="/posts/new" className="text-accent-foreground">
                  <Camera className="w-6 h-6 text-green-500" />
                </Link>
              </Button>
              <Button variant="outline" className="hidden sm:flex" asChild>
                <Link href="/posts/new" className="text-accent-foreground">
                  <span className="flex items-center gap-2">
                    <Camera className="w-6 h-6 text-green-500" />
                    <span className="text-sm">投稿</span>
                  </span>
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
  );
}
