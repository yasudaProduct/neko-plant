import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  className?: string;
};

/** 猫チップ */
export default function CatChip({ name, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
        "bg-gray-100 border border-gray-200 text-gray-600",
        className,
      )}
    >
      <PawPrint className="w-3.5 h-3.5" />
      {name}
    </span>
  );
}
