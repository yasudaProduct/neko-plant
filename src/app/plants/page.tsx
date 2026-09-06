import Link from "next/link";
import { Metadata } from "next";
import { BookHeart, Plus } from "lucide-react";
import { searchPlants, PlantFilter, PlantSortBy } from "@/actions/plant-action";
import { searchPosts } from "@/actions/post-action";
import { getNekoSpecies } from "@/actions/neko-action";
import { Button } from "@/components/ui/button";
import SearchBox from "@/components/np/SearchBox";
import FilterPills from "@/components/np/FilterPills";
import SortSelect from "@/components/np/SortSelect";
import BreedSelect from "@/components/np/BreedSelect";
import PlantResultList from "./PlantResultList";
import PostResultList from "./PostResultList";
import EmptyState from "@/components/np/EmptyState";

export const metadata: Metadata = {
  title: "植物と猫の共存をさがす",
  description:
    "みんなの投稿から集計した共存実績を、植物名や条件で確認できます。猫と一緒に暮らせる植物をさがしましょう。",
  alternates: { canonical: "/plants" },
};

const PAGE_SIZE = 12;
const VALID_SORTS: PlantSortBy[] = ["cats", "posts", "name"];
const VALID_FILTERS: PlantFilter[] = ["all", "proven", "noinfo"];

type SearchPageParams = {
  q?: string;
  tab?: string;
  sort?: string;
  filter?: string;
  neko?: string;
};

export default async function PlantsSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const tab = params.tab === "posts" ? "posts" : "plants";
  const sort = VALID_SORTS.includes(params.sort as PlantSortBy) ? (params.sort as PlantSortBy) : "cats";
  const filter = VALID_FILTERS.includes(params.filter as PlantFilter) ? (params.filter as PlantFilter) : "all";
  const nekoId = Number(params.neko) || undefined;

  // 初期ページのみサーバーで取得し、続きは各リストがクライアントから追記する
  const [plantsResult, postsResult, species] = await Promise.all([
    searchPlants(query, sort, 1, PAGE_SIZE, filter),
    searchPosts(query, nekoId, 1, PAGE_SIZE),
    getNekoSpecies(),
  ]);

  const buildUrl = (overrides: Partial<SearchPageParams>) => {
    const next = new URLSearchParams();
    const merged = { q: query, tab, sort, filter, neko: params.neko, ...overrides };
    if (merged.q) next.set("q", merged.q);
    if (merged.tab && merged.tab !== "plants") next.set("tab", merged.tab);
    if (merged.sort && merged.sort !== "cats") next.set("sort", merged.sort);
    if (merged.filter && merged.filter !== "all") next.set("filter", merged.filter);
    if (merged.neko) next.set("neko", merged.neko);
    const qs = next.toString();
    return `/plants${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-12">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">植物と猫の共存をさがす</h1>
        <p className="text-sm text-gray-600">
          みんなの投稿から集計した共存実績を、植物名や条件で確認できます。
        </p>
      </div>

      <div className="mb-5">
        <SearchBox initialQuery={query} />
      </div>

      <div className="mb-5">
        <FilterPills value={filter} />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* タブ */}
        <div className="flex items-center border-b border-border">
          <Link
            href={buildUrl({ tab: "plants" })}
            className={`px-4 py-2 text-sm ${
              tab === "plants"
                ? "text-gray-900 font-semibold border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            植物 {plantsResult.totalCount}件
          </Link>
          <Link
            href={buildUrl({ tab: "posts" })}
            className={`px-4 py-2 text-sm ${
              tab === "posts"
                ? "text-gray-900 font-semibold border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            投稿 {postsResult.totalCount}件
          </Link>
        </div>
        <div className="flex-1"></div>
        {tab === "plants" ? (
          <SortSelect value={sort} />
        ) : (
          <BreedSelect value={params.neko ?? "all"} species={species} />
        )}
      </div>

      {/* 結果 */}
      {tab === "plants" ? (
        plantsResult.plants.length > 0 ? (
          // 絞り込み条件が変わったら追記済みの結果を捨てる (key で作り直す)
          <PlantResultList
            key={`${query}|${sort}|${filter}`}
            initialPlants={plantsResult.plants}
            totalCount={plantsResult.totalCount}
            query={query}
            sort={sort}
            filter={filter}
            pageSize={PAGE_SIZE}
          />
        ) : (
          <EmptyState
            text="植物が見つかりませんでした"
            action={
              <>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {/* 検索した名前をそのまま渡し、0件を登録の入口にする */}
                  {query && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                      <Link href={`/plants/new?name=${encodeURIComponent(query)}`}>
                        <Plus className="w-4 h-4" />
                        <span className="max-w-[12rem] truncate">「{query}」を登録する</span>
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/zukan">
                      <BookHeart className="w-4 h-4" />
                      共存図鑑で全植物を見る
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  写真と一緒に登録したいときは、投稿するときにも追加できます
                </p>
              </>
            }
          />
        )
      ) : postsResult.posts.length > 0 ? (
        <PostResultList
          key={`${query}|${params.neko ?? ""}`}
          initialPosts={postsResult.posts}
          totalCount={postsResult.totalCount}
          query={query}
          nekoId={nekoId}
          pageSize={PAGE_SIZE}
        />
      ) : (
        <EmptyState
          icon="image"
          text="条件に合う投稿がありません"
          action={
            (query || params.neko) && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/plants?tab=posts">絞り込みを解除する</Link>
              </Button>
            )
          }
        />
      )}

    </div>
  );
}
