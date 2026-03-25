import { getFeedPosts } from "@/actions/post-action";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Cat, Heart, Leaf, PlusCircle } from "lucide-react";
import { Post } from "@/types/post";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Number(page || "1");

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8 flex flex-col items-center">
            <Image
              src="/images/logo.png"
              alt="logo"
              width={80}
              height={80}
              className="mb-3 rounded-md"
            />
            <p className="text-2xl font-bold text-primary mb-2">
              猫と植物の暮らしを共有する
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              みんなの投稿から、植物と猫の共存実績がわかります
            </p>
            <Link
              href="/posts/new"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              投稿する
            </Link>
          </div>

          {/* フィード */}
          <Suspense fallback={<FeedSkeleton />}>
            <FeedContent page={currentPage} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function FeedContent({ page }: { page: number }) {
  const { posts, totalCount } = await getFeedPosts(page, 12);
  const totalPages = Math.ceil(totalCount / 12);

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">まだ投稿がありません</p>
        <Link
          href="/posts/new"
          className="text-green-600 hover:underline text-sm"
        >
          最初の投稿をしてみましょう
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`/?page=${page - 1}`}
              className="px-4 py-2 rounded-full border text-sm hover:bg-gray-50"
            >
              前のページ
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/?page=${page + 1}`}
              className="px-4 py-2 rounded-full border text-sm hover:bg-gray-50"
            >
              次のページ
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 投稿者情報 */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Link href={`/${post.user.aliasId}`} className="flex items-center gap-2">
          {post.user.imageSrc ? (
            <Image
              src={post.user.imageSrc}
              alt={post.user.name}
              width={36}
              height={36}
              className="rounded-full object-cover w-9 h-9"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
              <Cat className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <span className="text-sm font-medium hover:underline">{post.user.name}</span>
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
          {post.imageUrls.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              +{post.imageUrls.length - 1}
            </div>
          )}
        </div>
      )}

      {/* 情報エリア */}
      <div className="p-4">
        {/* 植物タグ */}
        {post.plant && (
          <Link href={`/plants/${post.plant.id}`}>
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full mb-2 hover:bg-green-100 transition-colors">
              <Leaf className="w-3 h-3" />
              {post.plant.name}
            </span>
          </Link>
        )}

        {/* 猫情報 */}
        {post.pet && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <Cat className="w-3 h-3" />
            <span>{post.pet.name}</span>
            {post.pet.neko?.name && (
              <span className="text-muted-foreground">（{post.pet.neko.name}）</span>
            )}
          </div>
        )}

        {/* コメント */}
        {post.comment && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3 mb-3">
            {post.comment}
          </p>
        )}

        {/* いいね */}
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Heart className="w-4 h-4" />
          <span>{post.likeCount}</span>
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white border rounded-xl overflow-hidden animate-pulse">
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
          <div className="w-full aspect-square bg-gray-200" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
