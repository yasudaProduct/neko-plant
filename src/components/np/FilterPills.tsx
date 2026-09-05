"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PawPrint, Sprout, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// 配色は CoexistBadge と意味を揃える。
// 緑=共存実績あり / オレンジ=情報なし / グレー=中立 (どちらでもない「全て」)。
// 「全て」にオレンジを使うと警告色と意味が衝突するため使わない。
const PILLS = [
  {
    value: "all",
    label: "全て",
    icon: PawPrint,
    active: "bg-gray-200 border-gray-300 text-gray-800 shadow-inner",
    inactive: "bg-white border-gray-300 text-gray-500 hover:bg-gray-100",
  },
  {
    value: "proven",
    label: "実績あり",
    icon: Sprout,
    active: "bg-green-100 border-green-200 text-green-700 shadow-inner",
    inactive: "bg-white border-green-200 text-gray-500 hover:bg-green-50",
  },
  {
    value: "noinfo",
    label: "情報なし",
    icon: TriangleAlert,
    active: "bg-orange-100 border-orange-200 text-orange-700 shadow-inner",
    inactive: "bg-white border-orange-200 text-gray-500 hover:bg-orange-50",
  },
] as const;

/** 共存実績の絞り込みピル (URLの filter パラメータを切り替える) */
export default function FilterPills({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={cn("flex flex-wrap justify-center gap-3 sm:gap-4", className)}>
      {PILLS.map((pill) => {
        const isActive = value === pill.value;
        return (
          <button
            key={pill.value}
            type="button"
            onClick={() => onChange(pill.value)}
            data-testid={`filter-${pill.value}`}
            className={cn(
              // 高さは SortSelect (h-9) に合わせ、横並びにしたときの段差をなくす
              "flex h-9 items-center gap-2 rounded-full border px-5 sm:px-6 text-sm font-medium",
              "transition-all hover:scale-105 shadow-sm",
              isActive ? pill.active : pill.inactive,
            )}
          >
            <pill.icon className="w-4 h-4" />
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
