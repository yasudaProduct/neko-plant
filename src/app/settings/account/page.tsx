import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WithdrawalModal from "./WithdrawalModal";
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
            <h2 className="font-medium mb-2">メールアドレス</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <FcGoogle className="w-4 h-4" />
            Google
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-medium mb-2">アカウントの削除</h2>
          </div>
          <WithdrawalModal />
        </div>
      </div>
    </Card>
  );
}
