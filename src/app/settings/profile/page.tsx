import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    <Card className="p-6 space-y-8">
      <div className="flex flex-col items-center gap-2">
        <Avatar className="w-24 h-24">
          <AvatarImage src="" />
          <AvatarFallback className="bg-muted">
            <img
              src={
                user_profiles.image ||
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
              }
              alt="プロフィール画像"
              className="w-24 h-24 rounded-full object-cover"
            />
          </AvatarFallback>
        </Avatar>
        <Button variant="ghost" className="text-blue-500 hover:text-blue-600">
          変更する
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center gap-1">
            ユーザー名
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="username"
            defaultValue={user_profiles.name}
            className="max-w-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">表示名</Label>
          <Input
            id="displayName"
            defaultValue={user_profiles.alias_id}
            className="max-w-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">自己紹介</Label>
          <Textarea
            id="bio"
            //   defaultValue={user_profiles.bio}
            className="min-h-[150px] max-w-xl"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8">
          保存
        </Button>
      </div>
    </Card>
  );
}
