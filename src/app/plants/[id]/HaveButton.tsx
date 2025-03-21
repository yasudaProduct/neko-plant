"use client";

import { Sprout } from "lucide-react";
import { addHave, deleteHave } from "@/actions/plant-action";
import { useState } from "react";
import SubmitButton from "@/components/Button";
import { useAction } from "@/hooks/useAction";

interface HaveButtonProps {
  plantId: number;
  isHave: boolean;
}

export default function HaveButton({ plantId, isHave }: HaveButtonProps) {
  const [isHaveState, setIsHaveState] = useState(isHave);
  const { execute: executeDeleteHave } = useAction(deleteHave);
  const { execute: executeAddHave } = useAction(addHave);

  const handleClick = async () => {
    setIsHaveState(!isHaveState);

    if (isHaveState) {
      const result = await executeDeleteHave({ params: { plantId } });
      if (!result?.success) {
        setIsHaveState(true);
      }
    } else {
      const result = await executeAddHave({ params: { plantId } });
      if (!result?.success) {
        setIsHaveState(false);
      }
    }
  };

  return (
    <SubmitButton onClick={handleClick}>
      {isHaveState ? (
        <>
          <Sprout className="w-4 h-4 text-green-500" />
        </>
      ) : (
        <>
          <Sprout className="w-4 h-4" />
        </>
      )}
    </SubmitButton>
  );
}
