"use client";

import { searchPosts } from "@/actions/post-action";
import { Post } from "@/types/post";
import PostTile from "@/components/np/PostTile";
import LoadMoreButton from "@/components/np/LoadMoreButton";
import { useLoadMore } from "@/hooks/use-load-more";

type Props = {
  initialPosts: Post[];
  totalCount: number;
  query: string;
  nekoId?: number;
  pageSize: number;
};

/** 投稿の検索結果。初期ページはサーバーで取得し、続きはボタンで追記する */
export default function PostResultList({
  initialPosts,
  totalCount,
  query,
  nekoId,
  pageSize,
}: Props) {
  const { items: posts, isLoading, loadMore } = useLoadMore(initialPosts, async (page) => {
    const result = await searchPosts(query, nekoId, page, pageSize);
    return result.posts;
  });

  const remaining = totalCount - posts.length;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {posts.map((post) => (
          <PostTile key={post.id} post={post} />
        ))}
      </div>

      {remaining > 0 && (
        <LoadMoreButton onClick={loadMore} isLoading={isLoading} remaining={remaining} />
      )}
    </>
  );
}
