import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFeedPosts, getSiteStats } from "@/actions/post-action";
import { getPlants } from "@/actions/plant-action";
import { Button } from "@/components/ui/button";
import PostFeedList from "./PostFeedList";
import EmptyState from "@/components/np/EmptyState";
import CoexistBadge from "@/components/np/CoexistBadge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PAGE_SIZE = 12;

export default async function Home() {
  const supabase = await createClient();

  const [{ data: { user } }, { posts, totalCount }, stats, topPlants] = await Promise.all([
    supabase.auth.getUser(),
    getFeedPosts(1, PAGE_SIZE),
    getSiteStats(),
    // 「実績の多い植物」枠なので、実績のない植物 (catCount: 0) は混ぜない
    getPlants("cats", 1, 5, "proven"),
  ]);

  // ヒーローの写真: 共存実績の多い植物への最新の投稿写真。
  // すぐ下のフィード先頭と同じ写真が2回続かないよう、別の写真を持つ植物を優先する
  const firstFeedImage = posts[0]?.imageUrls[0];
  const plantsWithPhoto = topPlants.plants.filter((plant) => plant.mainImageUrl);
  const heroPlant =
    plantsWithPhoto.find((plant) => plant.mainImageUrl !== firstFeedImage) ?? plantsWithPhoto[0];

  // ランキングのバーは1位の猫の数を基準にする (getPlants は猫の数の多い順)
  const maxCatCount = topPlants.plants[0]?.catCount ?? 0;

  const heroStats = [
    { label: "投稿", value: stats.postCount, unit: "件" },
    { label: "猫", value: stats.catCount, unit: "匹" },
    { label: "植物", value: stats.plantCount, unit: "種" },
  ];

  return (
    <div>
      {/* M7 — 初見向けヒーロー (未ログイン時のみ)。左に説明、右に実際の投稿写真 */}
      {!user && (
        <section aria-labelledby="hero-title" className="border-b border-border">
          <div className="mx-auto max-w-[632px] px-4 py-12 sm:py-16 lg:grid lg:max-w-[964px] lg:grid-cols-2 lg:items-center lg:gap-8">
            <div className="flex flex-col items-start">
              <h1
                id="hero-title"
                className="np-display text-[30px] font-medium leading-[1.3] text-ink sm:text-[40px] lg:text-[44px]"
              >
                猫と植物は、<wbr />いっしょに暮らせる？
              </h1>
              <p className="mt-5 max-w-[30em] text-[15px] leading-[1.9] text-ink-secondary [word-break:auto-phrase] sm:text-base">
                猫と植物が一緒に写った写真を、みんなで共有しています。投稿が集まるほど、植物ごとに何匹の猫と暮らしているかが見えてきます。
              </p>
              <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="flex items-baseline gap-2">
                    <dt className="text-[13px] text-ink-muted">{stat.label}</dt>
                    <dd className="text-[13px] text-ink-secondary">
                      <span className="mr-0.5 text-lg font-medium text-ink tabular-nums">
                        {stat.value.toLocaleString()}
                      </span>
                      {stat.unit}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="h-11 rounded-lg px-5 text-[15px]" asChild>
                  <Link href="/signin">投稿をはじめる</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 rounded-lg bg-card px-5 text-[15px]" asChild>
                  <Link href="/plants">
                    <Search strokeWidth={1.5} />
                    植物をさがす
                  </Link>
                </Button>
              </div>
            </div>

            {/* 写真 → 植物 → 共存実績、というこのサービスの流れを1枚で見せる (モバイルはフィードが写真を担う) */}
            {heroPlant?.mainImageUrl && (
              <Link
                href={`/plants/${heroPlant.id}`}
                aria-label={`${heroPlant.name}の共存実績を見る`}
                className="group relative block pb-6 max-lg:hidden"
              >
                <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-secondary">
                  <Image
                    src={heroPlant.mainImageUrl}
                    alt=""
                    fill
                    sizes="450px"
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="np-label absolute bottom-0 left-6 flex flex-col gap-1 py-2.5 pr-4 [--np-label-bg:hsl(var(--card))] [--np-label-tip:14px] drop-shadow-[0_6px_16px_rgba(31,27,22,0.14)]">
                  <span className="text-[15px] font-medium leading-tight text-ink transition-colors group-hover:text-primary">
                    {heroPlant.name}
                  </span>
                  <CoexistBadge catCount={heroPlant.catCount} variant="quiet" />
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 1440px 幅でもフィードとサイドパネルが離れないよう、列幅をコンテンツの実寸
          (600px + 300px) に合わせ、ヒーローと同じ幅で中央に置く */}
      <div className="mx-auto grid max-w-[632px] grid-cols-1 items-start gap-8 px-4 pt-8 pb-16 lg:max-w-[964px] lg:grid-cols-[minmax(0,600px)_300px]">
        {/* フィード */}
        <div className="min-w-0">
          {/* モバイルではサイドパネルがフィードの下に回り、眺めに来た人 (M1) の目に入らない。
              実績ランキングだけ横スクロールの園芸ラベル列にしてフィード上部へ出す */}
          {topPlants.plants.length > 0 && (
            <section aria-labelledby="top-plants-mobile" className="mb-8 lg:hidden">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="top-plants-mobile" className="text-[15px] font-medium text-ink">
                  共存実績の多い植物
                </h2>
                <Link
                  href="/zukan"
                  className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline"
                >
                  共存図鑑
                  <ChevronRight className="size-4" strokeWidth={1.5} />
                </Link>
              </div>
              {/* 画面端まで流れて見えるよう、親の左右パディング分を打ち消す */}
              <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {topPlants.plants.map((plant) => (
                  <li key={plant.id} className="shrink-0">
                    <Link
                      href={`/plants/${plant.id}`}
                      className="np-label inline-flex h-9 items-center gap-2 pr-3 text-sm text-ink [--np-label-bg:hsl(var(--card))] drop-shadow-[0_1px_2px_rgba(31,27,22,0.10)]"
                    >
                      <span className="max-w-32 truncate">{plant.name}</span>
                      <span className="text-xs text-ink-muted tabular-nums">
                        {plant.catCount.toLocaleString()}匹
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="text-lg font-medium text-ink">新着の投稿</h2>
            <span className="text-[13px] text-ink-muted tabular-nums">
              全{totalCount.toLocaleString()}件
            </span>
          </div>

          {posts.length > 0 ? (
            <PostFeedList initialPosts={posts} totalCount={totalCount} pageSize={PAGE_SIZE} />
          ) : (
            <EmptyState icon="image" text="投稿がまだありません" />
          )}
        </div>

        {/* サイドパネル */}
        <aside className="flex flex-col gap-4">
          <section
            aria-labelledby="top-plants"
            className="rounded-2xl border border-border bg-card p-5 max-lg:hidden"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="top-plants" className="text-[15px] font-medium text-ink">
                共存実績の多い植物
              </h2>
              <span className="text-xs text-ink-muted">一緒に暮らす猫の数</span>
            </div>
            {topPlants.plants.length > 0 ? (
              <ol className="mt-3 flex flex-col">
                {topPlants.plants.map((plant, i) => {
                  const ratio = maxCatCount > 0 ? plant.catCount / maxCatCount : 0;
                  return (
                    <li key={plant.id}>
                      <Link
                        href={`/plants/${plant.id}`}
                        className="-mx-2 grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-md px-2 py-2 transition-colors hover:bg-secondary"
                      >
                        <span className="text-[13px] text-ink-muted tabular-nums">{i + 1}</span>
                        <span className="truncate text-sm text-ink">{plant.name}</span>
                        <span className="text-[13px] text-ink-secondary tabular-nums">
                          {plant.catCount.toLocaleString()}匹
                        </span>
                        {/* 1位だけアクセント色、ほかは中立色 */}
                        <span
                          aria-hidden
                          className="col-span-2 col-start-2 h-1 overflow-hidden rounded-full bg-foreground/[0.06]"
                        >
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              i === 0 ? "bg-primary" : "bg-foreground/20",
                            )}
                            style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                          />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-[1.7] text-ink-secondary">
                まだ共存実績のある植物がありません。最初の投稿から実績が集まります。
              </p>
            )}
            <Link
              href="/zukan"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              共存図鑑を見る
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </Link>
          </section>

          <section aria-labelledby="coexist-note" className="rounded-xl bg-secondary/60 p-4">
            <h2 id="coexist-note" className="text-xs font-medium text-ink-secondary">
              共存実績について
            </h2>
            <p className="mt-1 text-xs leading-[1.7] text-ink-secondary">
              表示している数字は、みんなの投稿から集計した共存の実績です。安全を保証するものではなく、投稿がない植物は「情報がない」状態として扱っています。
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
