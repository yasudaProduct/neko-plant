import Link from "next/link";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <PawPrint className="w-12 h-12 text-green-600" />
      <h1 className="text-2xl font-bold text-gray-900">ページが見つかりません</h1>
      <p className="text-sm text-gray-600 leading-normal">
        お探しのページは削除されたか、URLが変更された可能性があります。
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button className="bg-green-600 hover:bg-green-700" asChild>
          <Link href="/">ホームへ戻る</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/plants">植物をさがす</Link>
        </Button>
      </div>
    </div>
  );
}
