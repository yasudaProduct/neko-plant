import { Image as ImageIcon, Leaf } from "lucide-react";
import Link from "next/link";
import {
  getUserPosts,
  getUserProfile,
} from "@/actions/user-action";
import { notFound } from "next/navigation";
import Image from "next/image";
import PostDeleteButton from "./PostDeleteButton";

export default async function ProfilePostsPage({
  params,
}: {
  params: Promise<{ aliasId: string }>;
}) {
  const { aliasId } = await params;

  const userProfile = await getUserProfile(aliasId);
  if (!userProfile) {
    return notFound();
  }

  const posts = await getUserPosts(userProfile.id);

  return (
    <div className="space-y-6">
      {/* 投稿一覧 */}
      <div className="lg:min-w-[500px] pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="text-green-500" />
          投稿一覧
        </h2>
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="text-muted-foreground text-sm">まだ投稿がありません</p>
          )}
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* 投稿画像 */}
              {post.imageUrls.length > 0 ? (
                <Link href={`/plants/${post.plant?.id}`}>
                  <Image
                    src={post.imageUrls[0]}
                    alt="投稿画像"
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                </Link>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                  <Leaf className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div className="flex flex-col gap-1 flex-1">
                {post.plant && (
                  <Link href={`/plants/${post.plant.id}`}>
                    <p className="text-sm font-medium hover:underline text-green-700">
                      {post.plant.name}
                    </p>
                  </Link>
                )}
                {post.comment && (
                  <p className="text-sm text-gray-600 line-clamp-2">{post.comment}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {post.createdAt.toLocaleDateString("ja-JP")}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <PostDeleteButton postId={post.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
