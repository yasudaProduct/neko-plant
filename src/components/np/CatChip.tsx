import Image from "next/image";
import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  /** 猫プロフィールの写真。あれば肉球アイコンの代わりに顔を出す */
  imageSrc?: string;
  className?: string;
};

/** 猫チップ (植物の園芸ラベルと区別するため、猫は丸いチップ) */
export default function CatChip({ name, imageSrc, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 text-xs text-gray-600",
        imageSrc ? "pl-1 pr-3" : "px-3",
        className,
      )}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          width={20}
          height={20}
          className="size-5 rounded-full object-cover"
        />
      ) : (
        <PawPrint className="size-4" strokeWidth={1.5} />
      )}
      {name}
    </span>
  );
}
