import Image from "next/image";
import Link from "next/link";
import { Images } from "lucide-react";
import { Post } from "@/types/post";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LikeButton from "./LikeButton";
import PlantTag from "./PlantTag";
import CatChip from "./CatChip";
import CoexistBadge from "./CoexistBadge";
import PhotoPlaceholder from "./PhotoPlaceholder";

type Props = {
  post: Post;
  /** ファーストビューに入るカード (LCP候補) のみ true にする */
  priority?: boolean;
};

/** 猫チップの列 (2匹まで + 「+N」)。ヘッダー(PC)と本文(モバイル)で共用 */
function PetChips({ pets, className }: { pets: Post["pets"]; className?: string }) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {pets.slice(0, 2).map((pet) => (
        <CatChip key={pet.id} name={pet.name} />
      ))}
      {pets.length > 2 && (
        <span className="text-xs text-gray-500 self-center">+{pets.length - 2}</span>
      )}
    </div>
  );
}

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
        aria-label="投稿を見る"
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
            <PetChips pets={post.pets} className="max-sm:hidden ml-auto shrink-0" />
          )}
        </div>

        {/* 写真 */}
        <div className="relative aspect-[4/3] bg-gray-100">
          {post.imageUrls[0] ? (
            <Image
              src={post.imageUrls[0]}
              alt={`${post.user.name}さんの投稿`}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <PhotoPlaceholder icon="paw" />
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
          {/* モバイルはヘッダー右に余白がないため、猫チップを本文側に出す (猫×植物が中核情報) */}
          {post.pets.length > 0 && (
            <PetChips pets={post.pets} className="sm:hidden flex-wrap" />
          )}
          {post.plants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {post.plants.map((plant) => (
                <span key={plant.id} className="inline-flex flex-wrap items-center gap-2">
                  <PlantTag plant={plant} className="pointer-events-auto relative z-10" />
                  {/* バッジ=共存実績なので、タップは投稿詳細ではなく植物ページへ */}
                  <Link
                    href={`/plants/${plant.id}`}
                    className="pointer-events-auto relative z-10"
                    aria-label={`${plant.name}の共存実績を見る`}
                  >
                    <CoexistBadge catCount={plant.catCount} />
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
