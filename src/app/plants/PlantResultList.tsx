"use client";

import { PlantFilter, PlantSortBy, searchPlants } from "@/actions/plant-action";
import { Plant } from "@/types/plant";
import PlantResultCard from "@/components/np/PlantResultCard";
import LoadMoreButton from "@/components/np/LoadMoreButton";
import { useLoadMore } from "@/hooks/use-load-more";

type Props = {
  initialPlants: Plant[];
  totalCount: number;
  query: string;
  sort: PlantSortBy;
  filter: PlantFilter;
  pageSize: number;
};

/** 植物の検索結果。初期ページはサーバーで取得し、続きはボタンで追記する */
export default function PlantResultList({
  initialPlants,
  totalCount,
  query,
  sort,
  filter,
  pageSize,
}: Props) {
  const { items: plants, isLoading, loadMore } = useLoadMore(initialPlants, async (page) => {
    const result = await searchPlants(query, sort, page, pageSize, filter);
    return result.plants;
  });

  const remaining = totalCount - plants.length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plants.map((plant) => (
          <PlantResultCard key={plant.id} plant={plant} />
        ))}
      </div>

      {remaining > 0 && (
        <LoadMoreButton onClick={loadMore} isLoading={isLoading} remaining={remaining} />
      )}
    </>
  );
}
