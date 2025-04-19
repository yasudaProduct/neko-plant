"use client";

import { deleteEvaluation } from "@/actions/evaluation-action";
import Button from "@/components/Button";
import { useToast } from "@/hooks/use-toast";
import { Trash } from "lucide-react";

export default function PlantEvalButtom({
  evaluationId,
}: {
  evaluationId: number;
}) {
  const { success, error } = useToast();

  const handleDelete = async () => {
    try {
      const result = await deleteEvaluation(evaluationId);
      if (result.success) {
        success({
          title: "評価を削除しました。",
        });
      } else {
        error({
          title: "評価の削除に失敗しました。",
          description: result.message,
        });
      }
    } catch {
      error({
        title: "評価の削除に失敗しました。",
        description: "再度試してください。",
      });
    } finally {
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        className="text-red-500"
        text="削除"
        pendingText="削除中..."
        onClick={() => {
          handleDelete();
        }}
      >
        <Trash className="w-4 h-4" />
      </Button>
    </div>
  );
}
