import { Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { getUserPosts, getUserProfile } from "@/actions/user-action";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { deletePost } from "@/actions/post-action";
import { Button } from "@/components/ui/button";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ aliasId: string }>;
}) {
  const { aliasId } = await params;

  // ユーザー情報取得
  const userProfile = await getUserProfile(aliasId);
  if (!userProfile) {
    return notFound();
  }

  const posts = await getUserPosts(userProfile.id);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canDelete = user?.id === userProfile.authId;

  return (
    <div className="space-y-6">
      <div className="lg:min-w-[500px] pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="text-green-500" />
          投稿一覧
        </h2>
        <div className="overflow-y-auto max-h-[300px]">
          {posts &&
            posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg mb-4 hover:bg-gray-100 transition-colors"
              >
                <Link href={`/plants/${post.plant.id}`}>
                  <Image
                    src={post.imageUrls[0] ?? "/images/plant_default.png"}
                    alt="投稿画像"
                    width={100}
                    height={100}
                  />
                </Link>
                <div className="flex flex-col gap-2">
                  <p>{post.plant.name}</p>
                  <p>{post.createdAt.toLocaleString()}</p>
                  <p className="text-sm">{post.comment ?? "コメントなし"}</p>
                </div>
                {canDelete && (
                  <form
                    action={async () => {
                      "use server";
                      await deletePost(post.id);
                    }}
                    className="ml-auto"
                  >
                    <Button variant="destructive" size="sm" type="submit">
                      削除
                    </Button>
                  </form>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
