import { Image as ImageIcon, Leaf, PawPrint } from "lucide-react";

type Props = {
  icon?: "leaf" | "image" | "paw";
  text: string;
};

export default function EmptyState({ icon = "leaf", text }: Props) {
  const Icon = icon === "image" ? ImageIcon : icon === "paw" ? PawPrint : Leaf;

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-gray-400">
      <Icon className="w-10 h-10" strokeWidth={1.5} />
      <p className="text-sm">{text}</p>
    </div>
  );
}
