"use client";

import { Search } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Input } from "./ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getPlants,
  searchPlantName,
  searchPlants,
} from "@/actions/plant-action";
import { Plant } from "@/types/plant";
import PlantCard, { PlantCardProps } from "./PlantCard";
import { Evaluation, EvaluationType } from "@/types/evaluation";
import { getEvaluations } from "@/actions/evaluation-action";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Pagination } from "./ui/pagination";

// 1ページあたりの表示件数
const PAGE_SIZE = 8;

export default function PlantSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const sortBy = searchParams.get("sort") || "evaluation_desc";
  const currentPage = Number(searchParams.get("page") || "1");

  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantCards, setPlantCards] = useState<PlantCardProps[]>([]);
  const [plantSuggest, setPlantSuggest] = useState<
    { id: number; name: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [currentSort, setCurrentSort] = useState<string>(sortBy);
  const [totalCount, setTotalCount] = useState<number>(0);

  // 初期ロード時と検索クエリが変更された時に植物を取得
  useEffect(() => {
    const fetchPlants = async () => {
      setIsSearching(true);
      try {
        let result;
        if (query) {
          result = await searchPlants(query, sortBy, currentPage, PAGE_SIZE);
        } else {
          result = await getPlants(sortBy, currentPage, PAGE_SIZE);
        }
        setPlants(result.plants);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("植物の取得中にエラーが発生しました:", error);
      } finally {
        setIsSearching(false);
      }
    };
    fetchPlants();
  }, [query, sortBy, currentPage]);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (plants.length > 0) {
        const plantCards: PlantCardProps[] = await Promise.all(
          plants.map(async (plant) => {
            const evaluations: Evaluation[] = await getEvaluations(plant.id);
            return {
              name: plant.name,
              imageSrc: plant.imageUrl || undefined,
              isSafe: evaluations.length > 0, // TODO: Safeは必要？
              likes: evaluations.filter(
                (evaluation) => evaluation.type === EvaluationType.GOOD
              ).length,
              dislikes: evaluations.filter(
                (evaluation) => evaluation.type === EvaluationType.BAD
              ).length,
              reviewCount: evaluations.length,
            };
          })
        );

        setPlantCards(plantCards);
      }
    };
    fetchEvaluations();
  }, [plants]);

  useEffect(() => {
    const fetchPlantName = async () => {
      const names = await searchPlantName(searchQuery);
      setPlantSuggest(names);
    };

    if (searchQuery) {
      fetchPlantName();
    }
  }, [searchQuery]);

  // 検索処理
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSuggestOpen(false);

    // URLのクエリパラメータを更新
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery);
    }
    if (currentSort !== "name") {
      params.set("sort", currentSort);
    }
    // 検索時は常に1ページ目に戻る

    router.push(`/?${params.toString()}`);
  };

  // ソート順変更処理
  const handleSortChange = (value: string) => {
    setCurrentSort(value);

    const params = new URLSearchParams(searchParams.toString());
    if (value !== "name") {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    // ソート変更時は1ページ目に戻る
    params.delete("page");

    router.push(`/?${params.toString()}`);
  };

  // ページネーションのURLを生成する関数
  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (pageNumber > 1) {
      params.set("page", pageNumber.toString());
    } else {
      params.delete("page");
    }

    return `/?${params.toString()}`;
  };

  // 総ページ数を計算
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // クリックアウト時の処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !(event.target instanceof HTMLAnchorElement) // リンクがクリックされた場合はサジェストを閉じない
      ) {
        setIsSuggestOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative">
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="植物名を検索する"
            className="w-full pl-10 py-6 text-lg bg-background border-input pr-24"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSuggestOpen(true)}
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600"
            variant="outline"
          >
            <Search className="text-white" />
          </Button>
        </form>
        {isSuggestOpen && plantSuggest.length > 0 && (
          <div className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-md shadow-md z-50">
            {plantSuggest.map((name) => (
              <Link
                key={name.id}
                href={`/plants/${name.id}`}
                className="block w-full bg-white rounded-md p-2 hover:bg-gray-100 cursor-pointer"
              >
                {name.name}
              </Link>
            ))}
          </div>
        )}

        {isSearching && (
          <p className="text-sm text-muted-foreground mt-2">検索中...</p>
        )}
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {query ? `「${query}」の検索結果` : "すべての植物"}
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              （全{totalCount}件）
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">並び順:</span>
          <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px] rounded-full">
              <SelectValue placeholder="並び順を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="evaluation_desc">評価数（多い順）</SelectItem>
              <SelectItem value="name">名前（昇順）</SelectItem>
              <SelectItem value="name_desc">名前（降順）</SelectItem>
              <SelectItem value="created_at">登録日（古い順）</SelectItem>
              <SelectItem value="created_at_desc">
                登録日（新しい順）
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isSearching ? (
          <>
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="w-full h-full">
                <CardHeader>
                  <Skeleton className="w-full h-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[20px] rounded-full mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-[16px] rounded-full" />
                    <Skeleton className="h-[16px] rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : plants.length === 0 ? (
          query ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">
                「{query}」の検索結果がありません
              </p>
            </div>
          ) : (
            <>
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <Card key={`skeleton-${index}`} className="w-full h-full">
                  <CardContent>
                    <CardHeader>
                      <Skeleton className="w-full h-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[20px] rounded-full" />
                    </CardContent>
                  </CardContent>
                </Card>
              ))}
            </>
          )
        ) : (
          <>
            {plants.map((plant) => (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <PlantCard
                  name={plant.name}
                  imageSrc={plant.imageUrl || "/images/plant_default.png"}
                  isSafe={
                    plantCards.find((card) => card.name === plant.name)
                      ?.isSafe || false
                  }
                  likes={
                    plantCards.find((card) => card.name === plant.name)
                      ?.likes || 0
                  }
                  dislikes={
                    plantCards.find((card) => card.name === plant.name)
                      ?.dislikes || 0
                  }
                  reviewCount={
                    plantCards.find((card) => card.name === plant.name)
                      ?.reviewCount || 0
                  }
                />
              </Link>
            ))}
          </>
        )}
      </div>

      {!isSearching && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          createPageURL={createPageURL}
        />
      )}
    </>
  );
}
