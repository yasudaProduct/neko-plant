import Link from "next/link";
import { Button } from "./ui/button";
import { Leaf, PawPrint, Sprout } from "lucide-react";
import { DropdownMenu } from "./HeaderDropMenu";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileByAuthId } from "@/actions/user-action";

export default async function Header() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = await getUserProfileByAuthId();

  return (
    <header className="bg-[#2d5a27] text-primary-foreground p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl max-sm:text-lg font-medium"
          >
            <PawPrint className="w-6 h-6" />
            猫と植物
            <Leaf className="w-6 h-6" />
          </Link>
          <span className="text-sm text-gray-100">Beta Version</span>
        </div>
        <div className="flex items-center gap-2">
          {!session || !user ? (
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/signin" className="text-accent-foreground">
                ログイン
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" className="w-10 h-10 sm:hidden">
                <Link href="/plants/new" className="text-accent-foreground">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-6 h-6 text-green-500" />
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="hidden sm:block mr-2">
                <Link href="/plants/new" className="text-accent-foreground">
                  <div className="flex items-center gap-2">
                    <Sprout className="w-6 h-6 text-green-500" />
                    <span className="text-sm">植物を追加</span>
                  </div>
                </Link>
              </Button>
              <DropdownMenu
                userImage={user.imageSrc || "/images/cat_default.png"}
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
