import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  plant: { id: number; name: string };
  className?: string;
};

/** 植物タグ (植物ページへのリンク)。鉢に挿す園芸ラベルの形 (.np-label) で植物名を示す */
export default function PlantTag({ plant, className }: Props) {
  return (
    <Link
      href={`/plants/${plant.id}`}
      className={cn(
        "np-label inline-flex h-7 items-center pr-3 text-[13px] font-medium text-ink",
        className,
      )}
    >
      {plant.name}
    </Link>
  );
}
