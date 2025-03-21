"use client";

import { Sprout } from "lucide-react";
import { addHave, deleteHave } from "@/actions/plant-action";
import { useState } from "react";
import AuthProtectedButton from "@/components/Button";

interface HaveButtonProps {
  plantId: number;
  isHave: boolean;
}

export default function HaveButton({ plantId, isHave }: HaveButtonProps) {
  const [isHaveState, setIsHaveState] = useState(isHave);

  return (
    // <Button
    //   variant="outline"
    //   className="flex items-center"
    //   onClick={handleClick}
    // >
    //   {isHaveState ? (
    //     <>
    //       <Sprout className="w-4 h-4 text-green-500" />
    //     </>
    //   ) : (
    //     <>
    //       <Sprout className="w-4 h-4" />
    //     </>
    //   )}
    // </Button>
    <AuthProtectedButton
      action={() => {
        if (isHaveState) {
          return deleteHave({ params: { plantId } });
        } else {
          return addHave({ params: { plantId } });
        }
      }}
      onClick={() => {
        setIsHaveState(!isHaveState);
      }}
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
    </AuthProtectedButton>
  );
}
