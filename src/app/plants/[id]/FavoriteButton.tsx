"use client";

import { BookHeart } from "lucide-react";
import { addFavorite, deleteFavorite } from "@/actions/plant-action";
import { useState } from "react";
import SubmitButton from "@/components/Button";
import { useAction } from "@/hooks/useAction";

interface FavoriteButtonProps {
  plantId: number;
  isFavorite: boolean;
}

export default function FavoriteButton({
  plantId,
  isFavorite,
}: FavoriteButtonProps) {
  const { execute: executeDeleteFavorite } = useAction(deleteFavorite);
  const { execute: executeAddFavorite } = useAction(addFavorite);
  const [isFavoriteState, setIsFavoriteState] = useState(isFavorite);

  const handleClick = async () => {
    setIsFavoriteState(!isFavoriteState);
    if (isFavoriteState) {
      const result = await executeDeleteFavorite({ params: { plantId } });
      if (!result?.success) {
        setIsFavoriteState(true);
      }
    } else {
      const result = await executeAddFavorite({ params: { plantId } });
      if (!result?.success) {
        setIsFavoriteState(false);
      }
    }
  };
  return (
    <SubmitButton
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
    </SubmitButton>
  );
}
