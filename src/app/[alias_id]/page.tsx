import { createClient } from "@/lib/supabase/server";
import { Pencil } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("ProfilePage:user", user);

  if (!user) {
    return <div>ユーザーが見つかりません</div>;
  }

  console.log("ProfilePage: user", user);

  const { data: user_profiles } = await supabase
    .from("users")
    .select("alias_id, name, image")
    .eq("auth_id", user.id)
    .single();

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-4 mb-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800">ユーザー設定</h1>
        <div className="flex items-center justify-between mb-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">プロフィール</h2>
          <Link
            href="/profile/edit"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
          >
            <Pencil className="w-4 h-4" />
            <span>編集</span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <img
              src={
                user_profiles?.image ||
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
              }
              alt="プロフィール画像"
              className="w-24 h-24 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold">
                {user_profiles?.name || "未設定"}
              </h2>
              <p className="text-gray-500">@{user_profiles?.alias_id}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">飼い猫情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <img
                    src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=150"
                    alt="モモ"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-medium">モモ</h3>
                    <p className="text-sm text-gray-600">
                      アメリカンショートヘア
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
