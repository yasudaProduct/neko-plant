import { Leaf, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: "leaf" | "paw";
  /**
   * 帯状の控えめな表示。一覧で写真のない項目が続くとき、
   * 通常サイズのグレー面が並んで「グレーの壁」になるのを防ぐ
   */
  compact?: boolean;
  /** compact のときに添える説明 (例: 写真はまだありません) */
  label?: string;
  className?: string;
};

/** 写真がない場合のプレースホルダー */
export default function PhotoPlaceholder({
  icon = "leaf",
  compact = false,
  label,
  className,
}: Props) {
  const Icon = icon === "paw" ? PawPrint : Leaf;

  if (compact) {
    return (
      <div
        className={cn(
          "w-full h-20 bg-gray-50 border-b border-border flex items-center justify-center gap-2 text-gray-500",
          className,
        )}
      >
        <Icon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
        {label && <span className="text-xs">{label}</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full bg-gray-100 flex items-center justify-center text-gray-300",
        className,
      )}
    >
      <Icon className="w-10 h-10" strokeWidth={1.5} />
    </div>
  );
}
