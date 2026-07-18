import Image from "next/image";
import Link from "next/link";
import { Images } from "lucide-react";
import { Post } from "@/types/post";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LikeButton from "./LikeButton";
import PlantTag from "./PlantTag";
import CatChip from "./CatChip";
import CoexistBadge from "./CoexistBadge";

type Props = {
  post: Post;
  /** ファーストビューに入るカード (LCP候補) のみ true にする */
  priority?: boolean;
};

/** フィード用の投稿カード */
export default function PostCard({ post, priority = false }: Props) {
  const postHref = `/posts/${post.id}`;

  return (
    <article
      className="relative bg-white rounded-xl border border-border shadow-sm overflow-hidden cursor-pointer"
      data-testid="post-card"
    >
      <Link
        href={postHref}
        className="absolute inset-0 z-0"
        aria-label={`${post.user.name}さんの投稿を見る`}
        data-testid="post-card-link"
      />

      <div className="relative z-10 pointer-events-none">
        {/* ヘッダー: 投稿者 + 猫 */}
        <div className="flex items-center gap-2.5 p-4 pb-3">
          <Link href={`/${post.user.aliasId}`} className="pointer-events-auto shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarImage src={post.user.imageSrc} alt={post.user.name} />
              <AvatarFallback>{post.user.name.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col gap-0.5 min-w-0">
            <Link
              href={`/${post.user.aliasId}`}
              className="pointer-events-auto w-fit max-w-full text-sm font-bold text-gray-900 truncate hover:underline"
            >
              {post.user.name}
            </Link>
            <span className="text-xs text-gray-500">{formatRelativeTime(post.createdAt)}</span>
          </div>
          {post.pets.length > 0 && (
            <div className="flex gap-1.5 max-sm:hidden ml-auto shrink-0">
              {post.pets.slice(0, 2).map((pet) => (
                <CatChip key={pet.id} name={pet.name} />
              ))}
              {post.pets.length > 2 && (
                <span className="text-xs text-gray-500 self-center">+{post.pets.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* 写真 */}
        <div className="relative aspect-[4/3] bg-gray-100">
          {post.imageUrls[0] && (
            <Image
              src={post.imageUrls[0]}
              alt={`${post.user.name}さんの投稿`}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="object-cover"
              priority={priority}
            />
          )}
          {post.imageUrls.length > 1 && (
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/50 text-white px-2.5 py-0.5 text-xs">
              <Images className="w-3.5 h-3.5" />
              {post.imageUrls.length}
            </span>
          )}
        </div>

        {/* 本文 */}
        <div className="flex flex-col gap-2 p-4">
          <LikeButton
            postId={post.id}
            initialLiked={post.likedByMe}
            initialCount={post.likeCount}
            className="pointer-events-auto w-fit"
          />
          {post.comment && (
            <p className="text-sm text-gray-700 leading-normal whitespace-pre-wrap">{post.comment}</p>
          )}
          {post.plants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {post.plants.map((plant) => (
                <span key={plant.id} className="inline-flex flex-wrap items-center gap-2">
                  <PlantTag plant={plant} className="pointer-events-auto relative z-10" />
                  <CoexistBadge catCount={plant.catCount} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
