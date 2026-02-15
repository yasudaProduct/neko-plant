"use client";

import { Search, Sprout, AlertTriangle, PawPrint } from "lucide-react";
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
import PlantCard from "./PlantCard";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Pagination } from "./ui/pagination";

// 1ページあたりの表示件数
const PAGE_SIZE = 8;

type SafetyFilter = "all" | "safe" | "danger";

const parseSafetyFilter = (value: string | null): SafetyFilter => {
  if (value === "safe") return "safe";
  if (value === "danger") return "danger";
  return "all";
};

export default function PlantSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const sortBy = searchParams.get("sort") || "evaluation_desc";
  const currentPage = Number(searchParams.get("page") || "1");
  const initialFilter = parseSafetyFilter(searchParams.get("filter"));

  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantSuggest, setPlantSuggest] = useState<
    { id: number; name: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [currentSort, setCurrentSort] = useState<string>(sortBy);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [evaluationFilter, setEvaluationFilter] =
    useState<SafetyFilter>(initialFilter);

  // 初期ロード時と検索クエリが変更された時に植物を取得
  useEffect(() => {
    const fetchPlants = async () => {
      setIsSearching(true);
      try {
        let result;
        if (query) {
          result = await searchPlants(
            query,
            sortBy,
            currentPage,
            PAGE_SIZE,
            evaluationFilter
          );
        } else {
          result = await getPlants(
            sortBy,
            currentPage,
            PAGE_SIZE,
            evaluationFilter
          );
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
  }, [query, sortBy, currentPage, evaluationFilter]);

  useEffect(() => {
    setEvaluationFilter(parseSafetyFilter(searchParams.get("filter")));
  }, [searchParams]);

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
    if (evaluationFilter !== "all") {
      params.set("filter", evaluationFilter);
    }
    // 検索時は常に1ページ目に戻る

    router.push(`/?${params.toString()}`);
  };

  const handleFilterChange = (value: SafetyFilter) => {
    setEvaluationFilter(value);

    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    // フィルター変更時は1ページ目に戻す
    params.delete("page");

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
            data-testid="search-input"
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600"
            variant="outline"
          >
            <Search className="text-white" />
          </Button>
          {/* 植物名のサジェスト */}
          {isSuggestOpen && plantSuggest.length > 0 && (
            <div
              className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-md shadow-md z-50"
              data-testid="plant-suggestions"
            >
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
        </form>

        {/* 安全/危険フィルター */}
        <div className="flex justify-center gap-4 mt-6">
          <Button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`rounded-full px-6 py-2 transition-all duration-300 font-medium border flex items-center gap-2 hover:scale-105 ${
              evaluationFilter === "all"
                ? "bg-orange-100 border-orange-200 text-orange-700 shadow-inner"
                : "bg-white border-orange-100 text-gray-500 hover:bg-orange-50 shadow-sm"
            }`}
            variant="ghost"
          >
            <PawPrint className="w-4 h-4" />
            全て
          </Button>
          <Button
            type="button"
            onClick={() => handleFilterChange("safe")}
            className={`rounded-full px-6 py-2 transition-all duration-300 font-medium border flex items-center gap-2 hover:scale-105 ${
              evaluationFilter === "safe"
                ? "bg-green-100 border-green-200 text-green-700 shadow-inner"
                : "bg-white border-green-100 text-gray-500 hover:bg-green-50 shadow-sm"
            }`}
            variant="ghost"
          >
            <Sprout className="w-4 h-4" />
            安全
          </Button>
          <Button
            type="button"
            onClick={() => handleFilterChange("danger")}
            className={`rounded-full px-6 py-2 transition-all duration-300 font-medium border flex items-center gap-2 hover:scale-105 ${
              evaluationFilter === "danger"
                ? "bg-rose-100 border-rose-200 text-rose-700 shadow-inner"
                : "bg-white border-rose-100 text-gray-500 hover:bg-rose-50 shadow-sm"
            }`}
            variant="ghost"
          >
            <AlertTriangle className="w-4 h-4" />
            危険
          </Button>
        </div>
      </div>
      <div className="container mx-auto w-full xl:w-3/5 ">
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
                <SelectItem value="evaluation_desc">
                  評価数（多い順）
                </SelectItem>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6">
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
                    imageSrc={plant.mainImageUrl || "/images/plant_default.png"}
                    isSafe={plant.goodCount > 0}
                    likes={plant.goodCount}
                    dislikes={plant.badCount}
                    reviewCount={plant.goodCount + plant.badCount}
                  />
                </Link>
              ))}
            </>
          )}
        </div>
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
