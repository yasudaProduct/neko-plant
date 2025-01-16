"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { addEvaluation } from "./actions";
import { useFormState } from "react-dom";

export default function CommentForm({ plantId }: { plantId: number }) {
  return (
    <form action={addEvaluation}>
      <input type="hidden" name="plantId" value={plantId} />
      <Textarea name="comment" className="w-full h-24 p-2 border rounded-md" />
      <Button
        name="type"
        value="good"
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        <ThumbsUp className="w-4 h-4" />
        Good
      </Button>
      <Button
        name="type"
        value="bad"
        className="mt-2 bg-red-500 text-white px-4 py-2 rounded-md"
      >
        <ThumbsDown className="w-4 h-4" />
        Bad
      </Button>
    </form>
  );
}
