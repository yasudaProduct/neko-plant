"use client";

import { Button } from "@/components/ui/button";
import { BookHeart } from "lucide-react";
import { addFavorite, deleteFavorite } from "@/actions/plant-action";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  plantId: number;
  isFavorite: boolean;
}

export default function FavoriteButton({
  plantId,
  isFavorite,
}: FavoriteButtonProps) {
  const { success, error } = useToast();
  const [isFavoriteState, setIsFavoriteState] = useState(isFavorite);

  const handleClick = async () => {
    if (isFavoriteState) {
      setIsFavoriteState(false);
      const result = await deleteFavorite(plantId);
      if (result.success) {
        success({
          title: "お気に入りから削除しました。",
        });
      } else {
        error({
          title: "お気に入りから削除に失敗しました。",
        });
        setIsFavoriteState(true);
      }
    } else {
      setIsFavoriteState(true);
      const result = await addFavorite(plantId);
      if (result.success) {
        success({
          title: "お気に入りに追加しました。",
        });
      } else {
        error({
          title: "お気に入りに追加に失敗しました。",
        });
        setIsFavoriteState(false);
      }
    }
  };

  return (
    <Button
      variant="outline"
      className="flex items-center"
      onClick={handleClick}
    >
      {isFavoriteState ? (
        <>
          <BookHeart className="w-4 h-4 text-red-500" />
        </>
      ) : (
        <>
          <BookHeart className="w-4 h-4" />
        </>
      )}
    </Button>
  );
}
