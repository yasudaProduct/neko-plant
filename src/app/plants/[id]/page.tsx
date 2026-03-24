import { Suspense, cache } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CoexistenceBar from "@/components/RatingBar";
import { getPlant } from "@/actions/plant-action";
import { getPostsByPlantId } from "@/actions/post-action";
import { Post } from "@/types/post";
import { Plant } from "@/types/plant";
import { notFound } from "next/navigation";
import { Cat, Heart, Leaf, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const getCachedPlant = cache(getPlant);
const getCachedPosts = cache(getPostsByPlantId);

export default async function PlantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plant: Plant | undefined = await getCachedPlant(Number(id));
  if (!plant) {
    return notFound();
  }

  return (
    <div className="container mx-auto w-full 2xl:w-3/5">
      <div className="p-4">
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* メイン画像 */}
              {plant.mainImageUrl ? (
                <div className="w-full md:w-1/2 h-[300px] relative">
                  <Image
                    src={plant.mainImageUrl}
                    alt={plant.name}
                    fill
                    className="object-cover blur-md"
                    quality={90}
                  />
                  <Image
                    src={plant.mainImageUrl}
                    alt={plant.name}
                    fill
                    className="object-contain absolute top-0 left-0"
                    quality={90}
                    priority
                  />
                </div>
              ) : (
                <div className="w-full md:w-1/2 h-[300px] bg-gray-100 flex items-center justify-center">
                  <Leaf className="w-10 h-10 text-gray-400" />
                  <span className="text-gray-400 ml-2">No image</span>
                </div>
              )}

              {/* 植物情報 */}
              <div className="w-full md:w-1/2 flex flex-col gap-2 p-4">
                <div className="text-2xl font-bold">
                  <span data-testid="plant-name">{plant.name}</span>
                  <span className="text-sm text-gray-500 ml-4">
                    学名：
                    {plant.scientific_name
                      ? ` ${plant.scientific_name}`
                      : "未設定"}
                  </span>
                </div>
                <div className="text-sm text-gray-500 ml-4">
                  科：{plant.family ? plant.family : "未設定"}
                </div>
                <div className="text-sm text-gray-500 ml-4">
                  属：{plant.genus ? plant.genus : "未設定"}
                </div>
                <div className="text-sm text-gray-500 ml-4">
                  種：{plant.species ? plant.species : "未設定"}
                </div>

                <div className="mt-4">
                  <CoexistenceBar
                    catCount={plant.coexistenceCatCount}
                    postCount={plant.coexistencePostCount}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {user?.id && (
                <div className="flex gap-2">
                  <Link href={`/posts/new`}>
                    <Button variant="outline" size="sm">
                      <Leaf className="w-4 h-4 mr-1" />
                      投稿する
                    </Button>
                  </Link>
                  <Link href={`/plants/${plant.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* 関連投稿 */}
            <Suspense fallback={<PostsSkeleton />}>
              <PlantPostsGrid plantId={plant.id} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function PlantPostsGrid({ plantId }: { plantId: number }) {
  const { posts } = await getCachedPosts(plantId, 1, 20);

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>まだ投稿がありません</p>
        <Link href="/posts/new" className="text-green-600 hover:underline text-sm mt-2 inline-block">
          最初の投稿をする
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        関連する投稿 ({posts.length}件)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <div className="rounded-lg border bg-gray-50 overflow-hidden">
      {/* 投稿者 */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <Link href={`/${post.user.aliasId}`} className="flex items-center gap-2">
          {post.user.imageSrc ? (
            <Image
              src={post.user.imageSrc}
              alt={post.user.name}
              width={28}
              height={28}
              className="rounded-full object-cover w-7 h-7"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
              <Cat className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <span className="text-xs font-medium hover:underline">{post.user.name}</span>
        </Link>
        <span className="ml-auto text-xs text-muted-foreground">
          {post.createdAt.toLocaleDateString("ja-JP")}
        </span>
      </div>

      {/* 画像 */}
      {post.imageUrls.length > 0 && (
        <div className="relative w-full aspect-square bg-gray-100">
          <Image
            src={post.imageUrls[0]}
            alt="投稿画像"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* 情報 */}
      <div className="p-3">
        {post.pet && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <Cat className="w-3 h-3" />
            <span>{post.pet.name}</span>
          </div>
        )}
        {post.comment && (
          <p className="text-sm text-gray-700 line-clamp-2">{post.comment}</p>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
          <Heart className="w-3 h-3" />
          <span>{post.likeCount}</span>
        </div>
      </div>
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
      ))}
    </div>
  );
}
