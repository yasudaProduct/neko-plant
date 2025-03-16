"use client";

import { Plant } from "../types/plant";
import Image from "next/image";
import { X } from "lucide-react";
import { deleteFavoritePlant, deleteHavePlant } from "@/actions/user-action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface PlantCardProp {
  plant: Plant;
  authFlg: boolean;
}

export default function PlantContent({ plant, authFlg }: PlantCardProp) {
  const { success, error } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteHavePlant(plant.id);
      success({
        title: "飼ってる植物リストから削除しました",
      });
    } catch {
      error({
        title: "削除に失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    }
  };

  return (
    <div
      className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
        authFlg ? "hover:border-green-500" : ""
      }`}
      onClick={() => {
        router.push(`/plants/${plant.id}`);
      }}
    >
      <div className="flex items-start space-x-4">
        <Image
          src={plant.imageUrl || "/images/cat_default.png"}
          alt={plant.name}
          width={80}
          height={80}
          className="w-20 h-20 rounded-lg object-cover"
        />
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium">{plant.name}</h3>
          {authFlg && (
            <button
              type="button"
              className="p-1 text-red-500 hover:text-red-600 hover:border-red-500 hover:bg-red-500 rounded-md"
              onClick={handleDelete}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface FavoriteContentProp {
  plant: Plant;
  authFlg: boolean;
}

export function FavoriteContent({ plant, authFlg }: FavoriteContentProp) {
  const { success, error } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteFavoritePlant(plant.id);
      success({
        title: "削除しました",
      });
    } catch {
      error({
        title: "削除に失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    }
  };

  return (
    <div
      className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
        authFlg ? "hover:border-green-500" : ""
      }`}
      onClick={() => {
        router.push(`/plants/${plant.id}`);
      }}
    >
      <div className="flex items-start space-x-4">
        <Image
          src={plant.imageUrl || "/images/cat_default.png"}
          alt={plant.name}
          width={80}
          height={80}
          className="w-20 h-20 rounded-lg object-cover"
        />
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium">{plant.name}</h3>
          {authFlg && (
            <button
              type="button"
              className="p-1 text-red-500 hover:text-red-600 hover:border-red-500 hover:bg-red-500 rounded-md"
              onClick={handleDelete}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
