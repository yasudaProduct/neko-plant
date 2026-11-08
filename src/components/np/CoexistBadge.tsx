import { PawPrint, Sprout, TriangleAlert } from "lucide-react";
import { getCoexistenceMessage, getCoexistenceRank } from "@/lib/coexistence";
import { cn } from "@/lib/utils";

type Props = {
  catCount: number;
  /** compact: 「N匹」だけの短い表示 */
  compact?: boolean;
  size?: "sm" | "lg";
  /**
   * quiet: ピルにせず、意味色の点 + 文字だけで示す (フィードの投稿カード用)。
   * 植物名の園芸ラベルの横に並べ、植物と実績の関係を1行で読ませる
   */
  variant?: "pill" | "quiet";
  className?: string;
};

/** 共存実績バッジ (ポジティブリスト方式: 実績=緑 / 少数=グレー / 情報なし=オレンジ) */
export default function CoexistBadge({
  catCount,
  compact = false,
  size = "sm",
  variant = "pill",
  className,
}: Props) {
  const rank = getCoexistenceRank(catCount);

  const label = compact
    ? catCount > 0
      ? `${catCount}匹`
      : "情報なし"
    : getCoexistenceMessage(catCount);

  if (variant === "quiet") {
    const dot =
      rank === "many" || rank === "some"
        ? "bg-green-600"
        : rank === "few"
          ? "bg-gray-400"
          : "bg-orange-500";

    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-xs tabular-nums",
          rank === "none" ? "text-orange-700" : "text-gray-600",
          className,
        )}
      >
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
        {label}
      </span>
    );
  }

  const style =
    rank === "many" || rank === "some"
      ? "bg-green-100 border-green-200 text-green-700"
      : rank === "few"
        ? "bg-gray-100 border-gray-200 text-gray-600"
        : "bg-orange-100 border-orange-200 text-orange-700";

  const Icon = rank === "none" ? TriangleAlert : rank === "few" ? PawPrint : Sprout;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        compact ? "px-2.5 py-0.5 text-xs" : size === "lg" ? "px-4 py-1.5 text-sm" : "px-3 py-1 text-xs",
        style,
        className,
      )}
    >
      <Icon className={size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}
