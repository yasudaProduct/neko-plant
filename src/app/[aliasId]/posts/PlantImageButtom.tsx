"use client";

import { deletePostImage } from "@/actions/user-action";
import Button from "@/components/Button";
import { Trash } from "lucide-react";

export default function PlantImageButtom({
  postImageId,
}: {
  postImageId: number;
}) {
  const handleDelete = async () => {
    await deletePostImage(postImageId);
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
