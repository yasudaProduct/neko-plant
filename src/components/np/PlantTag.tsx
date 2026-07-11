import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  plant: { id: number; name: string };
  className?: string;
};

/** 植物タグ (植物ページへのリンクピル) */
export default function PlantTag({ plant, className }: Props) {
  return (
    <Link
      href={`/plants/${plant.id}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        "bg-white border border-green-200 text-green-700 hover:bg-green-100 transition-colors",
        className,
      )}
    >
      <Leaf className="w-3.5 h-3.5" />
      {plant.name}
    </Link>
  );
}
