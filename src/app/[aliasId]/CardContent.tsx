"use client";

import { Plant } from "../types/plant";
import Image from "next/image";
import { X } from "lucide-react";
import { deleteHavePlant } from "@/actions/user-action";
import { toast } from "@/hooks/use-toast";

interface PlantCardProp {
  plant: Plant;
  authFlg: boolean;
}

export default function PlantContent({ plant, authFlg }: PlantCardProp) {
  const handleDelete = async () => {
    try {
      await deleteHavePlant(plant.id);
      toast({
        title: "削除しました",
        description: "飼ってる植物から削除しました",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "削除に失敗しました",
      });
    }
  };

  return (
    <div
      className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
        authFlg ? "hover:border-green-500" : ""
      }`}
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
              className="h-4 w-4 text-red-500"
              onClick={handleDelete}
            >
              <X />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
