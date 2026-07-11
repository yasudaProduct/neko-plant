import { Leaf, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: "leaf" | "paw";
  className?: string;
};

/** 写真がない場合のプレースホルダー */
export default function PhotoPlaceholder({ icon = "leaf", className }: Props) {
  const Icon = icon === "paw" ? PawPrint : Leaf;

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
