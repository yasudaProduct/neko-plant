"use client";

import { getUserProfile } from "@/actions/user-action";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/types/user";
import Image from "next/image";
export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { aliasId }: { aliasId: string } = useParams();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const fetchUserProfile = async () => {
      const profile = await getUserProfile(aliasId);
      if (profile) {
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, [aliasId]);

  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  return (
    <div className="max-w-4xl mx-auto max-md:w-[90%] space-y-8 mt-4 mb-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">プロフィール</h2>
          {userProfile?.authId === user?.id && (
            <Link
              href="/settings/profile"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
            >
              <Pencil className="w-4 h-4" />
              <span>編集</span>
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Image
            src={userProfile?.imageSrc || "/images/logo.png"}
            alt="プロフィール画像"
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold">
              {userProfile?.name || "未設定"}
            </h2>
            <p className="text-gray-500">@{userProfile?.aliasId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 border-b mt-8">
          <Link href={`/${aliasId}`}>
            <button
              className={`px-4 py-2 ${
                isActive(`/${aliasId}`)
                  ? "text-black border-b-2 border-green-500"
                  : "text-black hover:text-gray-600"
              }`}
            >
              ユーザー
            </button>
          </Link>
          <Link href={`/${aliasId}/posts`}>
            <button
              className={`px-4 py-2 ${
                isActive(`/${aliasId}/posts`)
                  ? "text-black border-b-2 border-green-500"
                  : "text-black hover:text-gray-600"
              }`}
            >
              投稿
            </button>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
