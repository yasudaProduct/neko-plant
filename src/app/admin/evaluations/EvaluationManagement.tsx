"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteEvaluation } from "../actions";

interface EvaluationManagementProps {
  evaluation: {
    id: number;
    type: "good" | "bad";
    comment: string | null;
    createdAt: Date;
    reactionCount: number;
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

export default function EvaluationManagement({ evaluation }: EvaluationManagementProps) {
  const [isDeleted, setIsDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("この評価を削除してもよろしいですか？")) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteEvaluation(evaluation.id);
      setIsDeleted(true);
    } catch (error) {
      console.error("Failed to delete evaluation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDeleted) {
    return (
      <li className="px-6 py-4 bg-red-50">
        <div className="text-center">
          <Badge variant="destructive">削除済み</Badge>
          <p className="text-sm text-red-700 mt-2">評価が削除されました</p>
        </div>
      </li>
    );
  }

  return (
    <li className="px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {evaluation.plant.name}
            </h3>
            <Badge variant={evaluation.type === "good" ? "default" : "destructive"}>
              {evaluation.type === "good" ? "良い評価" : "悪い評価"}
            </Badge>
          </div>
          
          {evaluation.user && (
            <p className="text-sm text-gray-600 mb-2">
              投稿者: {evaluation.user.name} (@{evaluation.user.aliasId})
            </p>
          )}
          
          {evaluation.comment && (
            <p className="text-gray-700 mb-2">{evaluation.comment}</p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>リアクション: {evaluation.reactionCount}件</span>
            <span>{new Date(evaluation.createdAt).toLocaleDateString("ja-JP")}</span>
          </div>
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