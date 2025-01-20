"use client";

import { useState } from "react";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  userId: number;
  pet?: Pet;
  nekoSpecies: NekoSpecies[];
}

interface Pet {
  id: number;
  name: string;
  image: string;
  neko: {
    id: number;
    name: string;
  };
}
interface NekoSpecies {
  id: number;
  name: string;
}

export default function AddPetDialogContent({
  userId,
  pet,
  nekoSpecies,
}: AddPetModalProps) {
  const [newPetName, setNewPetName] = useState(pet?.name || "");
  const [newPetImage, setNewPetImage] = useState(pet?.image || "");
  const [newPetSpeciesId, setNewPetSpeciesId] = useState(pet?.neko.id || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleAddCat = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!newPetName) {
      setError("名前は必須です。");
      setLoading(false);
      return;
    }

    if (!newPetSpeciesId) {
      setError("猫種を選択してください。");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("pets").insert({
      name: newPetName,
      neko_id: newPetSpeciesId,
      user_id: userId,
    });

    if (error) {
      console.log("error", error);
      setError("飼い猫の追加に失敗しました。もう一度お試しください。");
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  const handleEditCat = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    const { error } = await supabase
      .from("pets")
      .update({
        name: newPetName,
        neko_id: newPetSpeciesId,
      })
      .eq("id", pet?.id);

    if (error) {
      console.log("error", error);
      setError("飼い猫の編集に失敗しました。もう一度お試しください。");
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    const { error } = await supabase.from("pets").delete().eq("id", pet?.id);

    if (error) {
      console.log("error", error);
      setError("飼い猫の削除に失敗しました。もう一度お試しください。");
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  const handleClose = () => {
    setNewPetName("");
    setNewPetImage("");
    setNewPetSpeciesId(1);
    setError("");
    setSuccess(false);
    setLoading(false);
  };

  return (
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
        <Select
          value={newPetSpeciesId.toString()}
          onValueChange={(value) => setNewPetSpeciesId(Number(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="猫種を選択" />
          </SelectTrigger>
          <SelectContent>
            {nekoSpecies.map((nekoSpecies) => (
              <SelectItem
                key={nekoSpecies.id}
                value={nekoSpecies.id.toString()}
              >
                {nekoSpecies.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && !pet && (
          <p className="text-green-500 text-sm">飼い猫を追加しました。</p>
        )}
        {success && pet && (
          <p className="text-green-500 text-sm">飼い猫を更新しました。</p>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
        </DialogClose>
        {!pet ? (
          <Button
            variant="default"
            onClick={handleAddCat}
            disabled={loading || !newPetName}
          >
            {loading ? "保存中..." : "保存"}
          </Button>
        ) : (
          <>
            <Button variant={"destructive"} onClick={handleDelete}>
              {loading ? "削除中..." : "削除"}
            </Button>
            <Button
              variant="default"
              onClick={handleEditCat}
              disabled={loading || !newPetName}
            >
              {loading ? "更新中..." : "更新"}
            </Button>
          </>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
