import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Post } from "@/types/post";

type Props = {
  post: Post;
};

/** 投稿のサムネイルタイル (ギャラリー・プロフィール用) */
export default function PostTile({ post }: Props) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="relative block aspect-square rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-lg transition-shadow bg-gray-100"
      data-testid="post-tile"
    >
      {post.imageUrls[0] && (
        <Image
          src={post.imageUrls[0]}
          alt={`${post.user.name}さんの投稿`}
          fill
          sizes="(max-width: 640px) 50vw, 280px"
          className="object-cover"
        />
      )}
      <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/50 text-white px-2.5 py-0.5 text-xs">
        <Heart className="w-3 h-3" />
        {post.likeCount}
      </span>
    </Link>
  );
}
