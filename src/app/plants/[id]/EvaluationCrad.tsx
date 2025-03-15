"use client";

import { Avatar } from "@/components/ui/avatar";
import { Evaluation } from "@/app/types/evaluation";
import { Pet } from "@/app/types/neko";
import Image from "next/image";
import { useEffect, useState } from "react";
export default function EvaluationCard({
  evaluation,
}: {
  evaluation: Evaluation;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(evaluation.comment.split("\n").length > 3);
  }, [evaluation.comment]);

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      key={evaluation.id}
      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
    >
      <Avatar className="w-10 h-10">
        {evaluation.pets?.map((pet: Pet) => (
          <Image
            key={pet.id}
            src={pet.imageSrc ?? "/images/cat_default.png"}
            alt={pet.name}
            width={60}
            height={60}
            className="rounded-full"
          />
        ))}
      </Avatar>
      <div className="relative bg-white p-4 rounded-lg shadow-sm flex-grow">
        <div className="absolute left-[-8px] top-3 w-4 h-4 bg-white transform rotate-45" />
        <div className="relative z-10">
          <div className="text-gray-700 whitespace-pre-wrap">
            <div>
              <p
                className={`text-gray-700 whitespace-pre-wrap ${
                  isExpanded ? "line-clamp-3" : "line-clamp-none"
                }`}
              >
                {evaluation.comment}
              </p>
              {evaluation.comment.split("\n").length > 3 && (
                <ExpandButton isExpanded={isExpanded} onExpand={handleExpand} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandButton({
  isExpanded,
  onExpand,
}: {
  isExpanded: boolean;
  onExpand: () => void;
}) {
  return (
    <button className="text-xs text-blue-500" onClick={onExpand}>
      {isExpanded ? "もっと見る" : "閉じる"}
    </button>
  );
}
