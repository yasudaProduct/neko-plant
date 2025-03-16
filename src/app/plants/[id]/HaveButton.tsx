"use client";

import { Button } from "@/components/ui/button";
import { Sprout } from "lucide-react";
import { addHave, deleteHave } from "@/actions/plant-action";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface HaveButtonProps {
  plantId: number;
  isHave: boolean;
}

export default function HaveButton({ plantId, isHave }: HaveButtonProps) {
  const { success, error } = useToast();
  const [isHaveState, setIsHaveState] = useState(isHave);

  const handleClick = async () => {
    if (isHaveState) {
      setIsHaveState(false);
      const result = await deleteHave(plantId);
      if (result.success) {
        success({
          title: "削除しました。",
        });
      } else {
        error({
          title: "削除に失敗しました。",
          description: result.message,
        });
        setIsHaveState(true);
      }
    } else {
      setIsHaveState(true);
      const result = await addHave(plantId);
      if (result.success) {
        success({
          title: "追加しました。",
        });
      } else {
        error({
          title: "追加に失敗しました。",
          description: result.message,
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
