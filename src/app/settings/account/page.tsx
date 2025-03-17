import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Info } from "lucide-react";
import { redirect } from "next/navigation";
import EmailChangeModal from "./EmailChangeModal";
import WithdrawalModal from "./WithdrawalModal";
import PasswordChangeModal from "./PasswordChangeModal";
import { getUserProfileByAuthId } from "@/actions/user-action";
import { FcGoogle } from "react-icons/fc";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const userProfile = await getUserProfileByAuthId();
  if (!userProfile) {
    redirect("/signin");
  }

  return (
    <Card className="divide-y">
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-medium">メールアドレス</h2>
              {/* <Info className="h-4 w-4 text-muted-foreground" /> */}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          {user.app_metadata.provider === "google" ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FcGoogle className="w-4 h-4" />
              Google
            </p>
          ) : (
            <EmailChangeModal currentEmail={user.email || ""} />
          )}
        </div>
      </div>
      {user.app_metadata.provider === "mail" && (
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-medium">パスワード</h2>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">********</p>
            </div>
            <PasswordChangeModal />
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-medium mb-2">アカウントの削除</h2>
          </div>
          <WithdrawalModal userId={user.id} />
        </div>
      </div>
    </Card>
  );
}
