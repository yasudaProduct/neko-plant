import { Image as ImageIcon, Leaf, PawPrint } from "lucide-react";

type Props = {
  icon?: "leaf" | "image" | "paw";
  text: string;
  /** 行き止まりにしないための次の導線 (ボタンや補足文) */
  action?: React.ReactNode;
};

export default function EmptyState({ icon = "leaf", text, action }: Props) {
  const Icon = icon === "image" ? ImageIcon : icon === "paw" ? PawPrint : Leaf;

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-gray-500">
      <Icon className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
      <p className="text-sm">{text}</p>
      {action && (
        <div className="mt-2 flex flex-col items-center gap-2">{action}</div>
      )}
    </div>
  );
}
