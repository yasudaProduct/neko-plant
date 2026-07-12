import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, getPostsByPlant } from "@/actions/post-action";
import { SITE_NAME } from "@/lib/site";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import BackLink from "@/components/np/BackLink";
import LikeButton from "@/components/np/LikeButton";
import PlantTag from "@/components/np/PlantTag";
import CatChip from "@/components/np/CatChip";
import CoexistBadge from "@/components/np/CoexistBadge";
import PostTile from "@/components/np/PostTile";
import DeletePostButton from "@/components/np/DeletePostButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(Number(id));

  if (!post) {
    return { title: "投稿が見つかりません", robots: { index: false } };
  }

  const plantNames = post.plants.map((plant) => plant.name).join("・");

  return {
    title: `${post.user.name}さんの投稿${plantNames ? ` (${plantNames})` : ""}`,
    description: post.comment ?? `${post.user.name}さんの猫と植物の暮らしの写真`,
    alternates: { canonical: `/posts/${post.id}` },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "ja_JP",
      url: `/posts/${post.id}`,
      images: post.imageUrls.length > 0
        ? [{ url: post.imageUrls[0], alt: `${post.user.name}さんの猫と植物の写真` }]
        : [{ url: "/images/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);

  if (Number.isNaN(postId)) {
    return notFound();
  }

  const post = await getPost(postId);

  if (!post) {
    return notFound();
  }

  // 同じ植物の投稿 (最初の植物タグから)
  const firstPlant = post.plants[0];
  const related = firstPlant
    ? (await getPostsByPlant(firstPlant.id, 1, 4)).posts.filter((p) => p.id !== post.id).slice(0, 3)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <BackLink />

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="grid grid-cols-[3fr_2fr] max-md:grid-cols-1">
          {/* 写真 */}
          <div className="relative border-r border-border max-md:border-r-0 max-md:border-b bg-gray-100 min-h-[320px]">
            {post.imageUrls.length > 1 ? (
              <Carousel className="h-full">
                <CarouselContent className="h-full">
                  {post.imageUrls.map((url) => (
                    <CarouselItem key={url}>
                      <div className="relative aspect-[4/3] min-h-[320px]">
                        <Image
                          src={url}
                          alt={`${post.user.name}さんの投稿`}
                          fill
                          sizes="(max-width: 768px) 100vw, 560px"
                          className="object-cover"
                          priority
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            ) : (
              <div className="relative aspect-[4/3] min-h-[320px]">
                {post.imageUrls[0] && (
                  <Image
                    src={post.imageUrls[0]}
                    alt={`${post.user.name}さんの投稿`}
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                    priority
                  />
                )}
              </div>
            )}
          </div>

          {/* 情報 */}
          <div className="p-5 flex flex-col gap-3.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <Link href={`/${post.user.aliasId}`}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.user.imageSrc} alt={post.user.name} />
                  <AvatarFallback>{post.user.name.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <Link
                  href={`/${post.user.aliasId}`}
                  className="text-sm font-bold text-gray-900 truncate hover:underline"
                >
                  {post.user.name}
                </Link>
                <span className="text-xs text-gray-500">{formatRelativeTime(post.createdAt)}</span>
              </div>
              {post.isMine && <DeletePostButton postId={post.id} />}
            </div>

            {post.comment && (
              <p className="text-base text-gray-700 leading-normal whitespace-pre-wrap">{post.comment}</p>
            )}

            {post.pets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500">写っている猫</span>
                <div className="flex gap-2 flex-wrap">
                  {post.pets.map((pet) => (
                    <CatChip key={pet.id} name={pet.name} />
                  ))}
                </div>
              </div>
            )}

            {post.plants.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-500">写っている植物</span>
                <div className="flex flex-col gap-2">
                  {post.plants.map((plant) => (
                    <div key={plant.id} className="flex items-center gap-2 flex-wrap">
                      <PlantTag plant={plant} />
                      <CoexistBadge catCount={plant.catCount} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-2 border-t border-border">
              <LikeButton
                postId={post.id}
                initialLiked={post.likedByMe}
                initialCount={post.likeCount}
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-base font-semibold text-gray-900">同じ植物の投稿</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {related.map((p) => (
              <PostTile key={p.id} post={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
