import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Info } from "lucide-react";
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
          <Button variant="outline" size="sm">
            変更する
          </Button>
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

    // <Card className="p-6 space-y-8">
    //   <div className="flex flex-col items-center gap-2">
    //     <Avatar className="w-24 h-24">
    //       <AvatarImage src="" />
    //       <AvatarFallback className="bg-muted">
    //         <img
    //           src={
    //             user.image ||
    //             "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
    //           }
    //           alt="プロフィール画像"
    //           className="w-24 h-24 rounded-full object-cover"
    //         />
    //       </AvatarFallback>
    //     </Avatar>
    //     <Button variant="ghost" className="text-blue-500 hover:text-blue-600">
    //       変更する
    //     </Button>
    //   </div>

    //   <div className="space-y-4">
    //     <div className="space-y-2">
    //       <Label htmlFor="username" className="flex items-center gap-1">
    //         ユーザー名
    //         <span className="text-red-500">*</span>
    //       </Label>
    //       <Input id="username" defaultValue={user.name} className="max-w-xl" />
    //     </div>

    //     <div className="space-y-2">
    //       <Label htmlFor="displayName">表示名</Label>
    //       <Input
    //         id="displayName"
    //         defaultValue={user.aliasId}
    //         className="max-w-xl"
    //       />
    //     </div>

    //     <div className="space-y-2">
    //       <Label htmlFor="bio">自己紹介</Label>
    //       <Textarea
    //         id="bio"
    //         //   defaultValue={user_profiles.bio}
    //         className="min-h-[150px] max-w-xl"
    //       />
    //     </div>
    //   </div>

    //   <div className="flex justify-end">
    //     <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8">
    //       保存
    //     </Button>
    //   </div>
    // </Card>
  );
}
