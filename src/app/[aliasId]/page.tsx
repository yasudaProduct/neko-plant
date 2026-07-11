import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getUserPets,
  getUserPlantCollection,
  getUserProfile,
  getUserStats,
} from "@/actions/user-action";
import { getPostsByUser } from "@/actions/post-action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/np/BackLink";
import ProfileTabs from "./ProfileTabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ aliasId: string }>;
}): Promise<Metadata> {
  const { aliasId } = await params;
  const profile = await getUserProfile(aliasId);

  return {
    title: profile ? `${profile.name}さんのプロフィール | 猫と植物` : "プロフィール | 猫と植物",
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ aliasId: string }>;
}) {
  const { aliasId } = await params;

  const userProfile = await getUserProfile(aliasId);

  if (!userProfile) {
    redirect("/");
  }

  const supabase = await createClient();

  const [{ data: { user } }, pets, { posts }, collection, stats] = await Promise.all([
    supabase.auth.getUser(),
    getUserPets(userProfile.id),
    getPostsByUser(userProfile.id, 1, 30),
    getUserPlantCollection(userProfile.id),
    getUserStats(userProfile.id),
  ]);

  const isSelf = user != null && userProfile.authId === user.id;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <BackLink />

      {/* プロフィールカード */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex items-center gap-5 flex-wrap">
        <Avatar className="w-20 h-20">
          <AvatarImage src={userProfile.imageSrc} alt={userProfile.name} />
          <AvatarFallback className="text-2xl">{userProfile.name.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900" data-testid="profile-name">
              {userProfile.name}
            </h1>
            <span className="text-sm text-gray-400">@{userProfile.aliasId}</span>
          </div>
          <div className="flex gap-5 pt-1 text-sm text-gray-600">
            <span>
              <strong className="text-gray-900">{stats.postCount}</strong> 投稿
            </span>
            <span>
              <strong className="text-gray-900">{stats.petCount}</strong> 猫
            </span>
            <span>
              <strong className="text-gray-900">{stats.plantCount}</strong> 植物
            </span>
          </div>
        </div>
        {isSelf && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/cats">
                <Pencil className="w-3.5 h-3.5" />
                猫プロフィールを編集
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/profile">
                <Pencil className="w-3.5 h-3.5" />
                プロフィール編集
              </Link>
            </Button>
          </div>
        )}
      </div>

      <ProfileTabs posts={posts} pets={pets ?? []} collection={collection} />
    </div>
  );
}
