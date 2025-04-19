"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import CommentForm from "./CommentForm";

export default function CommentFormDialog({ plantId }: { plantId: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="w-4 h-4" />
          評価を投稿する
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>評価を投稿する</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <CommentForm
            plantId={plantId}
            onSubmitSuccess={() => setIsOpen(false)}
          />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
