import { Cat } from "lucide-react";

export default function CoexistenceBar({
  catCount,
  postCount,
}: {
  catCount: number;
  postCount: number;
}) {
  const getLabel = () => {
    if (catCount >= 50) {
      return { text: "多くの猫と暮らしています 🐱🌿", color: "text-green-700" };
    } else if (catCount >= 10) {
      return { text: `${catCount}匹の猫と暮らしています`, color: "text-green-600" };
    } else if (catCount >= 1) {
      return { text: `${catCount}匹の猫との暮らしが報告されています`, color: "text-green-500" };
    } else if (postCount > 0) {
      return { text: `${postCount}件の投稿があります`, color: "text-gray-600" };
    } else {
      return { text: "猫との共存情報がありません ⚠️ 注意してください", color: "text-amber-600" };
    }
  };

  const { text, color } = getLabel();

  return (
    <div className="flex items-center gap-2 mb-6">
      <Cat className="w-6 h-6 text-green-600 shrink-0" />
      <span className={`text-sm font-medium ${color}`}>{text}</span>
    </div>
  );
}
