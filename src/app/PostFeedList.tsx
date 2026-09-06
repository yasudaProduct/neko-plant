"use client";

import { getFeedPosts } from "@/actions/post-action";
import { Post } from "@/types/post";
import PostCard from "@/components/np/PostCard";
import LoadMoreButton from "@/components/np/LoadMoreButton";
import { useLoadMore } from "@/hooks/use-load-more";

type Props = {
  initialPosts: Post[];
  totalCount: number;
  pageSize: number;
};

/** ホームのフィード。初期ページはサーバーで取得し、続きはボタンで追記する */
export default function PostFeedList({ initialPosts, totalCount, pageSize }: Props) {
  const { items: posts, isLoading, loadMore } = useLoadMore(initialPosts, async (page) => {
    const result = await getFeedPosts(page, pageSize);
    return result.posts;
  });

  const remaining = totalCount - posts.length;

  return (
    <>
      <div className="flex flex-col gap-5">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} priority={i === 0} />
        ))}
      </div>

      {remaining > 0 && (
        <LoadMoreButton onClick={loadMore} isLoading={isLoading} remaining={remaining} />
      )}
    </>
  );
}
