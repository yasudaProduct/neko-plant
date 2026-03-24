"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteAdminPost } from "../actions";

interface PostManagementProps {
  post: {
    id: number;
    comment: string | null;
    createdAt: Date;
    likeCount: number;
    imageCount: number;
    plant: {
      id: number;
      name: string;
    };
    user: {
      id: number;
      name: string;
      aliasId: string;
    } | null;
  };
}

export default function PostManagement({ post }: PostManagementProps) {
  const [isDeleted, setIsDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("この投稿を削除してもよろしいですか？")) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteAdminPost(post.id);
      setIsDeleted(true);
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDeleted) {
    return (
      <li className="px-6 py-4 bg-red-50">
        <div className="text-center text-sm text-red-700">投稿が削除されました</div>
      </li>
    );
  }

  return (
    <li className="px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {post.plant.name}
            </h3>
            <span className="text-xs text-gray-500">
              画像{post.imageCount}枚 · いいね{post.likeCount}件
            </span>
          </div>

          {post.user && (
            <p className="text-sm text-gray-600 mb-2">
              投稿者: {post.user.name} (@{post.user.aliasId})
            </p>
          )}

          {post.comment && (
            <p className="text-gray-700 mb-2 text-sm">{post.comment}</p>
          )}

          <span className="text-sm text-gray-500">
            {new Date(post.createdAt).toLocaleDateString("ja-JP")}
          </span>
        </div>

        <div className="ml-4">
          <Button
            onClick={handleDelete}
            disabled={isLoading}
            variant="destructive"
            size="sm"
          >
            {isLoading ? "削除中..." : "削除"}
          </Button>
        </div>
      </div>
    </li>
  );
}
