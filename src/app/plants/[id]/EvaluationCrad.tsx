"use client";

import { Avatar } from "@/components/ui/avatar";
import {
  Evaluation,
  EvaluationReAction,
  EvaluationReActionType,
} from "@/types/evaluation";
import { Pet } from "@/types/neko";
import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteReAction,
  getEvalReAction,
  upsertReAction,
} from "@/actions/evaluation-action";
import { ThumbsDown, ThumbsUp } from "lucide-react";
export default function EvaluationCard({
  evaluation,
}: {
  evaluation: Evaluation;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reActions, setReActions] = useState<EvaluationReAction[]>([]);
  const [isMineReAction, setIsMineReAction] = useState<
    EvaluationReActionType | undefined
  >(undefined);
  useEffect(() => {
    fetchReActions();
  }, []);

  useEffect(() => {
    setIsExpanded(evaluation.comment.split("\n").length > 3);
  }, [evaluation.comment]);

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleReAction = (type: EvaluationReActionType) => {
    if (isMineReAction === type) {
      // 自分のコメント評価をクリックした場合削除
      deleteReAction(evaluation.id);
    } else {
      // 自分のコメント評価をクリックしなかった場合作成
      upsertReAction(evaluation.id, type);
    }
    fetchReActions();
  };

  const fetchReActions = async () => {
    const reActions = await getEvalReAction(evaluation.id);
    setReActions(reActions);

    const mineReAction = reActions.find((reAction) => reAction.isMine);
    setIsMineReAction(mineReAction?.type);
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
      <div className="flex flex-col gap-2 w-full">
        <div className="text-sm text-gray-500 hover:text-gray-700">
          <Link href={`/${evaluation.user.aliasId}`}>
            {evaluation.user.name}
          </Link>
        </div>
        {/* コメント */}
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
                  <ExpandButton
                    isExpanded={isExpanded}
                    onExpand={handleExpand}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        {/* コメント評価 */}
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div
              className="flex items-center gap-2 hover:text-gray-700"
              onClick={() => handleReAction(EvaluationReActionType.GOOD)}
            >
              <ThumbsUp
                className={`w-4 h-4 ${
                  isMineReAction === EvaluationReActionType.GOOD
                    ? "text-blue-500"
                    : ""
                }`}
              />
              {
                reActions.filter(
                  (reAction) => reAction.type === EvaluationReActionType.GOOD
                ).length
              }
            </div>
            <div
              className="flex items-center gap-2 hover:text-gray-700 ml-2"
              onClick={() => handleReAction(EvaluationReActionType.BAD)}
            >
              <ThumbsDown
                className={`w-4 h-4 ${
                  isMineReAction === EvaluationReActionType.BAD
                    ? "text-blue-500"
                    : ""
                }`}
              />
              {
                reActions.filter(
                  (reAction) => reAction.type === EvaluationReActionType.BAD
                ).length
              }
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
