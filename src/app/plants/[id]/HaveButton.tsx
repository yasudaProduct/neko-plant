"use client";

import { Button } from "@/components/ui/button";
import { Sprout } from "lucide-react";
import { addHave, deleteHave } from "@/actions/plant-action";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface HaveButtonProps {
  plantId: number;
  isHave: boolean;
}

export default function HaveButton({ plantId, isHave }: HaveButtonProps) {
  const [isHaveState, setIsHaveState] = useState(isHave);

  const handleClick = async () => {
    if (isHaveState) {
      setIsHaveState(false);
      const result = await deleteHave(plantId);
      if (result.success) {
        toast({
          title: "削除しました。",
        });
      } else {
        toast({
          title: "削除に失敗しました。",
        });
        setIsHaveState(true);
      }
    } else {
      setIsHaveState(true);
      const result = await addHave(plantId);
      if (result.success) {
        toast({
          title: "追加しました。",
        });
      } else {
        toast({
          title: "追加に失敗しました。",
        });
        setIsHaveState(false);
      }
    }
  };

  return (
    <Button
      variant="outline"
      className="flex items-center"
      onClick={handleClick}
    >
      {isHaveState ? (
        <>
          <Sprout className="w-4 h-4 text-green-500" />
        </>
      ) : (
        <>
          <Sprout className="w-4 h-4" />
        </>
      )}
    </Button>
  );
}
