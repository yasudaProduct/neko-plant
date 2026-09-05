"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onClick: () => void;
  isLoading: boolean;
  /** 残り件数 (ボタンラベルに出す) */
  remaining: number;
};

/** 一覧の追記読み込みボタン (前へ/次へのフルリロードを置き換える) */
export default function LoadMoreButton({ onClick, isLoading, remaining }: Props) {
  return (
    <div className="flex justify-center mt-6">
      <Button variant="outline" onClick={onClick} disabled={isLoading} data-testid="load-more">
        {isLoading ? (
          "読み込み中..."
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            もっと見る（残り{remaining}件）
          </>
        )}
      </Button>
    </div>
  );
}
