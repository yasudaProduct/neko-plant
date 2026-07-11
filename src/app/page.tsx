import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PawPrint, Search, Sprout } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFeedPosts, getSiteStats } from "@/actions/post-action";
import { getPlants } from "@/actions/plant-action";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/np/PostCard";
import EmptyState from "@/components/np/EmptyState";

const PAGE_SIZE = 12;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  const [{ data: { user } }, { posts, totalCount }, stats, topPlants] = await Promise.all([
    supabase.auth.getUser(),
    getFeedPosts(page, PAGE_SIZE),
    getSiteStats(),
    getPlants("cats", 1, 5),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      {/* M7 — 初見向けヒーロー (未ログイン時のみ) */}
      {!user && (
        <section className="bg-gradient-to-b from-white to-secondary/30 border-b border-border px-4 py-12 text-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
            <Image
              src="/images/logo.png"
              alt="猫と植物"
              width={72}
              height={72}
              className="rounded-full bg-green-100"
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-snug">
              猫と植物は、いっしょに暮らせる？
            </h1>
            <p className="text-base text-gray-600 leading-normal">
              みんなの写真から、猫と植物の暮らしが見えてきます。
              <br className="max-sm:hidden" />
              かわいい瞬間を眺めながら、共存の実績を確かめられます。
            </p>
            <div className="flex justify-center gap-6 py-2">
              {[
                ["投稿", `${stats.postCount.toLocaleString()}件`],
                ["猫", `${stats.catCount}匹`],
                ["植物", `${stats.plantCount}種`],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xl font-bold text-green-700">{value}</span>
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
                <Link href="/signin">はじめる</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/plants">
                  <Search className="w-4 h-4" />
                  植物をさがす
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        {/* フィード */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">新着の投稿</h2>
            <span className="text-sm text-gray-500">全{totalCount}件</span>
          </div>

          {posts.length > 0 ? (
            <div className="flex flex-col gap-5 max-w-[600px]">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState icon="image" text="投稿がまだありません" />
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center gap-4 mt-8 max-w-[600px] justify-center">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/?page=${page - 1}`}>
                    <ChevronLeft className="w-4 h-4" />
                    前へ
                  </Link>
                </Button>
              )}
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/?page=${page + 1}`}>
                    次へ
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* サイドパネル */}
        <aside className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Sprout className="w-[18px] h-[18px] text-green-600" />
              共存実績の多い植物
            </h3>
            <div className="flex flex-col">
              {topPlants.plants.map((plant, i) => (
                <Link
                  key={plant.id}
                  href={`/plants/${plant.id}`}
                  className="flex items-center gap-2.5 px-2 py-2 -mx-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <span
                    className={`w-5 text-sm font-bold ${i < 3 ? "text-green-600" : "text-gray-400"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{plant.name}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <PawPrint className="w-3 h-3" />
                    {plant.catCount}匹
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/zukan"
              className="self-start text-sm text-green-700 font-medium inline-flex items-center gap-1 hover:underline"
            >
              共存図鑑を見る
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-lg bg-gray-50 border border-border p-4 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
              <PawPrint className="w-3.5 h-3.5" />
              共存実績について
            </span>
            <p className="text-xs text-gray-500 leading-normal">
              表示している数字は、みんなの投稿から集計した共存の実績です。安全を保証するものではなく、投稿がない植物は「情報がない」状態として扱っています。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
