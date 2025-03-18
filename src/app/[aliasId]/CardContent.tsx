"use client";

import { Plant } from "../types/plant";
import Image from "next/image";
import { Cat, Leaf, X } from "lucide-react";
import { deleteFavoritePlant, deleteHavePlant } from "@/actions/user-action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Pet } from "../types/neko";

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
        {plant.imageUrl ? (
          <Image
            src={plant.imageUrl}
            alt={plant.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover"
          />
        ) : (
          <div className="min-w-[80px] min-h-[80px] rounded-lg bg-gray-200 flex items-center justify-center">
            <Leaf className="w-10 h-10 text-gray-400" />
          </div>
        )}
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium">{plant.name}</h3>
          {authFlg && (
            <button
              type="button"
              className="p-1 text-red-500 hover:text-red-600 hover:border-red-500 hover:bg-red-500 rounded-md"
              onClick={handleDelete}
            >
              <X className="w-4 h-4 hover:text-white" />
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
        {plant.imageUrl ? (
          <Image
            src={plant.imageUrl}
            alt={plant.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover"
          />
        ) : (
          <div className="min-w-[80px] min-h-[80px] rounded-lg bg-gray-200 flex items-center justify-center">
            <Leaf className="w-10 h-10 text-gray-400" />
          </div>
        )}
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium">{plant.name}</h3>
          {authFlg && (
            <button
              type="button"
              className="p-1 text-red-500 hover:text-red-600 hover:border-red-500 hover:bg-red-500 rounded-md"
              onClick={handleDelete}
            >
              <X className="w-4 h-4 hover:text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PetCardProp {
  pet: Pet;
  authFlg: boolean;
}

export function PetCard({ pet, authFlg }: PetCardProp) {
  return (
    <div
      className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
        authFlg ? "hover:border-green-500" : ""
      }`}
    >
      <div className="flex items-start space-x-4">
        {pet.imageSrc ? (
          <Image
            src={pet.imageSrc}
            alt={pet.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
            <Cat className="w-10 h-10 text-gray-400" />
          </div>
        )}
        <div>
          <h3 className="font-medium">{pet.name}</h3>
          <p className="text-sm text-gray-600">{pet.neko.name}</p>
          {/* {user && user_profiles.auth_id === user.id && (
            <button type="button" className="text-red-500 text-sm mt-2">
              削除
            </button>
          )} */}
        </div>
      </div>
    </div>
  );
}
