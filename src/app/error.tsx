"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * グローバルエラーバウンダリ。
 * RSCやServer Actionの予期しない例外で素のNext.jsエラー画面 (白画面) を
 * 見せないためのフォールバック。エラー内容は画面に出さない。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <PawPrint className="w-12 h-12 text-green-600" />
      <h1 className="text-2xl font-bold text-gray-900">問題が発生しました</h1>
      <p className="text-sm text-gray-600 leading-normal">
        一時的な問題が発生しました。時間をおいて再度お試しください。
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button className="bg-green-600 hover:bg-green-700" onClick={reset}>
          再試行
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
