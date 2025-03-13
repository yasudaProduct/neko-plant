"use client";

import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { addFavorite, deleteFavorite } from "@/actions/plant-action";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  plantId: number;
  isFavorite: boolean;
}

export default function FavoriteButton({
  plantId,
  isFavorite,
}: FavoriteButtonProps) {
  const [isFavoriteState, setIsFavoriteState] = useState(isFavorite);

  const handleClick = async () => {
    if (isFavoriteState) {
      setIsFavoriteState(false);
      const result = await deleteFavorite(plantId);
      if (result.success) {
        toast({
          title: "お気に入りから削除しました。",
        });
      } else {
        toast({
          title: "お気に入りから削除に失敗しました。",
        });
        setIsFavoriteState(true);
      }
    } else {
      setIsFavoriteState(true);
      const result = await addFavorite(plantId);
      if (result.success) {
        toast({
          title: "お気に入りに追加しました。",
        });
      } else {
        toast({
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
          <Heart className="w-4 h-4 text-red-500" />
        </>
      ) : (
        <>
          <Heart className="w-4 h-4" />
        </>
      )}
    </Button>
  );
}
