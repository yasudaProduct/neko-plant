import Link from "next/link";
import { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { searchPlants, PlantFilter, PlantSortBy } from "@/actions/plant-action";
import { searchPosts } from "@/actions/post-action";
import { getNekoSpecies } from "@/actions/neko-action";
import { Button } from "@/components/ui/button";
import SearchBox from "@/components/np/SearchBox";
import FilterPills from "@/components/np/FilterPills";
import SortSelect from "@/components/np/SortSelect";
import BreedSelect from "@/components/np/BreedSelect";
import PlantResultCard from "@/components/np/PlantResultCard";
import PostTile from "@/components/np/PostTile";
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
  page?: string;
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
  const page = Math.max(1, Number(params.page) || 1);

  const [plantsResult, postsResult, species] = await Promise.all([
    searchPlants(query, sort, tab === "plants" ? page : 1, PAGE_SIZE, filter),
    searchPosts(query, nekoId, tab === "posts" ? page : 1, PAGE_SIZE),
    getNekoSpecies(),
  ]);

  const activeTotal = tab === "plants" ? plantsResult.totalCount : postsResult.totalCount;
  const totalPages = Math.max(1, Math.ceil(activeTotal / PAGE_SIZE));

  const buildUrl = (overrides: Partial<SearchPageParams>) => {
    const next = new URLSearchParams();
    const merged = { q: query, tab, sort, filter, neko: params.neko, ...overrides };
    if (merged.q) next.set("q", merged.q);
    if (merged.tab && merged.tab !== "plants") next.set("tab", merged.tab);
    if (merged.sort && merged.sort !== "cats") next.set("sort", merged.sort);
    if (merged.filter && merged.filter !== "all") next.set("filter", merged.filter);
    if (merged.neko) next.set("neko", merged.neko);
    if (merged.page && Number(merged.page) > 1) next.set("page", String(merged.page));
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
            href={buildUrl({ tab: "plants", page: undefined })}
            className={`px-4 py-2 text-sm ${
              tab === "plants"
                ? "text-gray-900 font-semibold border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            植物 {plantsResult.totalCount}件
          </Link>
          <Link
            href={buildUrl({ tab: "posts", page: undefined })}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plantsResult.plants.map((plant) => (
              <PlantResultCard key={plant.id} plant={plant} />
            ))}
          </div>
        ) : (
          <EmptyState text="植物が見つかりませんでした" />
        )
      ) : postsResult.posts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {postsResult.posts.map((post) => (
            <PostTile key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState icon="image" text="条件に合う投稿がありません" />
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center gap-4 mt-8 justify-center">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={buildUrl({ page: String(page - 1) })}>
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
              <Link href={buildUrl({ page: String(page + 1) })}>
                次へ
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
