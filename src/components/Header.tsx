import Link from "next/link";
import { Button } from "./ui/button";
import { Leaf } from "lucide-react";
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
        <Link href="/" className="flex items-center gap-2 text-xl font-medium">
          <Leaf className="w-6 h-6" />
          猫と植物
        </Link>
        <div className="flex items-center gap-2">
          {!session || !user ? (
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
                userImage={user.imageSrc || ""}
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
