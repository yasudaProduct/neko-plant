"use client";

import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddPetModalProps {
  userId: string;
}

export default function AddPetModal({ userId }: AddPetModalProps) {
  const [newPetName, setNewPetName] = useState("");
  const [newPetImage, setNewPetImage] = useState("");
  const [newPetSpeciesId, setNewPetSpeciesId] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleAddCat = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    if (newPetName) {
      setError("名前は必須です。");
      setLoading(false);
      return;
    }

    // const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setError("飼い猫の追加に失敗しました。もう一度お試しください。");
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center"
        >
          <span className="text-gray-500">+ 新しい猫を追加</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>飼い猫を追加する</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label htmlFor="name" className="block text-sm font-medium">
            飼い猫の名前
          </label>
          <Input
            id="name"
            type="text"
            value={newPetName}
            onChange={(e) => setNewPetName(e.target.value)}
            placeholder="例：ミケ"
          />
          <label htmlFor="species" className="block text-sm font-medium">
            猫種
          </label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="猫種を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">雑種</SelectItem>
              <SelectItem value="2">スコティッシュフォールド</SelectItem>
            </SelectContent>
          </Select>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && (
            <p className="text-green-500 text-sm">飼い猫を追加しました。</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" onClick={() => setNewPetName("")}>
              キャンセル
            </Button>
          </DialogClose>
          <Button
            variant="default"
            onClick={handleAddCat}
            disabled={loading || !newPetName}
          >
            {loading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
