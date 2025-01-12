import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Info } from "lucide-react";
import { redirect } from "next/navigation";
import EmailChangeModal from "./EmailChangeModal";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: user_profiles } = await supabase
    .from("users")
    .select("alias_id, name, image")
    .eq("auth_id", user.id)
    .single();

  if (!user_profiles) {
    redirect("/signin");
  }

  return (
    <Card className="divide-y">
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-medium">メールアドレス</h2>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          {/* モーダルのトリガーボタン */}
          <EmailChangeModal currentEmail={user.email || ""} />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-medium mb-2">アカウントの削除</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            アカウントを削除する
          </Button>
        </div>
      </div>
    </Card>
  );
}
