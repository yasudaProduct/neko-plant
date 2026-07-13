import Link from "next/link";
import { Metadata } from "next";
import { BookHeart, Sprout } from "lucide-react";
import { searchPlants, PlantFilter, PlantSortBy } from "@/actions/plant-action";
import { getSiteStats } from "@/actions/post-action";
import FilterPills from "@/components/np/FilterPills";
import SortSelect from "@/components/np/SortSelect";
import CoexistBar from "@/components/np/CoexistBar";
import CoexistBadge from "@/components/np/CoexistBadge";
import EmptyState from "@/components/np/EmptyState";

export const metadata: Metadata = {
  title: "共存図鑑",
  description:
    "みんなの投稿から集計した、植物ごとの「猫との共存実績」の記録です。ポジティブリスト方式で、猫と一緒に暮らしている実績のある植物がわかります。",
  alternates: { canonical: "/zukan" },
};

const VALID_SORTS: PlantSortBy[] = ["cats", "posts", "name"];
const VALID_FILTERS: PlantFilter[] = ["all", "proven", "noinfo"];

export default async function ZukanPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const sort = VALID_SORTS.includes(params.sort as PlantSortBy) ? (params.sort as PlantSortBy) : "cats";
  const filter = VALID_FILTERS.includes(params.filter as PlantFilter) ? (params.filter as PlantFilter) : "all";

  const [{ plants }, stats] = await Promise.all([
    searchPlants("", sort, 1, 200, filter),
    getSiteStats(),
  ]);

  const maxCats = Math.max(...plants.map((plant) => plant.catCount), 1);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-12">
      <div className="text-center mb-5">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2.5 mb-2">
          <BookHeart className="w-[26px] h-[26px] text-green-600" />
          共存図鑑
        </h1>
        <p className="text-sm text-gray-600">
          みんなの投稿から集計した、植物ごとの「猫との共存実績」の記録です。
        </p>
      </div>

      {/* ポジティブリスト方式の説明 */}
      <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-border px-4 py-3.5 mb-5 max-sm:flex-col max-sm:items-start">
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-200 text-green-700 px-3 py-1 text-xs font-semibold">
          <Sprout className="w-3.5 h-3.5" />
          ポジティブリスト方式
        </span>
        <p className="text-xs text-gray-500 leading-normal">
          投稿の分布から共存の実績を可視化します。危険は断定せず、投稿がない植物は「情報がない」状態として扱います。
        </p>
      </div>

      {/* 集計サマリー */}
      <div className="flex justify-center gap-8 mb-5">
        {[
          ["収録植物", `${stats.plantCount}種`],
          ["観測された猫", `${stats.catCount}匹`],
          ["投稿", `${stats.postCount.toLocaleString()}件`],
        ].map(([label, value]) => (
          <div key={label} className="text-center">
            <div className="text-xl font-bold text-green-700">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <FilterPills value={filter} />
        <div className="flex-1"></div>
        <SortSelect value={sort} />
      </div>

      {/* 図鑑リスト */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {plants.length > 0 ? (
          plants.map((plant, i) => (
            <Link
              key={plant.id}
              href={`/plants/${plant.id}`}
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${
                i < plants.length - 1 ? "border-b border-border" : ""
              }`}
              data-testid="zukan-row"
            >
              <span className="w-10 shrink-0 text-xs text-gray-400 font-medium">
                No.{String(i + 1).padStart(2, "0")}
              </span>
              <span className="w-36 shrink-0 flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-bold text-gray-900 truncate">{plant.name}</span>
                {plant.scientific_name && (
                  <span className="text-xs text-gray-400 italic truncate">{plant.scientific_name}</span>
                )}
              </span>
              <span className="flex-1 min-w-[60px]">
                <CoexistBar value={plant.catCount} max={maxCats} />
              </span>
              <span
                className={`w-14 shrink-0 text-right text-sm font-bold ${
                  plant.catCount > 0 ? "text-green-700" : "text-orange-700"
                }`}
              >
                {plant.catCount}匹
              </span>
              <span className="w-52 shrink-0 max-md:hidden">
                <CoexistBadge catCount={plant.catCount} />
              </span>
              <span className="w-20 shrink-0 text-right text-xs text-gray-500 max-md:hidden">
                {plant.postCount > 0 ? `投稿 ${plant.postCount}件` : "投稿なし"}
              </span>
            </Link>
          ))
        ) : (
          <EmptyState text="条件に合う植物がありません" />
        )}
      </div>

      <p className="mt-4 px-1 text-xs text-gray-500 leading-normal">
        共存実績は、ユニークな猫プロフィールを重視して集計しています。同一ユーザーの重複投稿だけで水増しされることはありません。
      </p>
    </div>
  );
}
