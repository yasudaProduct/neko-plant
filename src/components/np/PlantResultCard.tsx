import Image from "next/image";
import Link from "next/link";
import { Plant } from "@/types/plant";
import CoexistBadge from "./CoexistBadge";
import PhotoPlaceholder from "./PhotoPlaceholder";

type Props = {
  plant: Plant;
};

/** 植物の検索結果カード */
export default function PlantResultCard({ plant }: Props) {
  return (
    <Link
      href={`/plants/${plant.id}`}
      className="block bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
      data-testid="plant-card"
    >
      <div className="relative aspect-video bg-gray-100">
        {plant.mainImageUrl ? (
          <Image
            src={plant.mainImageUrl}
            alt={plant.name}
            fill
            sizes="(max-width: 640px) 100vw, 430px"
            className="object-cover"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{plant.name}</h3>
          {plant.scientific_name && (
            <span className="text-xs text-gray-400 italic truncate">{plant.scientific_name}</span>
          )}
        </div>
        <CoexistBadge catCount={plant.catCount} className="self-start" />
        <span className="text-xs text-gray-500">
          {plant.postCount > 0 ? `投稿 ${plant.postCount}件` : "投稿がありません"}
        </span>
      </div>
    </Link>
  );
}
