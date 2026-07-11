import { cn } from "@/lib/utils";

type Props = {
  value: number;
  max: number;
  highlight?: boolean;
  className?: string;
};

/** 共存実績バー (図鑑・分布チャート用) */
export default function CoexistBar({ value, max, highlight = false, className }: Props) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;

  return (
    <span
      className={cn(
        "block w-full h-3 rounded-full bg-gray-100 border border-border overflow-hidden",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full rounded-full transition-all",
          highlight ? "bg-green-600" : "bg-green-500 opacity-55",
        )}
        style={{ width: `${pct}%` }}
      ></span>
    </span>
  );
}
