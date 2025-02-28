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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NekoSpecies, Pet } from "../types/neko";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { addPet, deletePet, updatePet } from "@/actions/user-action";
import { toast } from "@/hooks/use-toast";

interface AddPetModalProps {
  pet?: Pet;
  nekoSpecies: NekoSpecies[];
}

const formSchema = z.object({
  name: z.string().min(1, {
    message: "名前は必須です。",
  }),
  species: z.number().min(1, {
    message: "猫種を選択してください。",
  }),
});

export default function AddPetDialogContent({
  pet,
  nekoSpecies,
}: AddPetModalProps) {
  // const [newPetImage, setNewPetImage] = useState(pet?.imageSrc || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: pet
      ? {
          name: pet.name,
          species: pet.neko.id,
        }
      : {
          name: "",
          species: 1,
        },
  });

  const handleDelete = async () => {
    if (!pet) {
      return;
    }

    setIsDeleting(true);

    try {
      await deletePet(pet.id);
      toast({
        title: "飼い猫を削除しました",
      });
    } catch {
      toast({
        title: "飼い猫の削除に失敗しました",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    form.reset();
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      if (pet) {
        await updatePet(pet.id, data.name, data.species);
        toast({
          title: "飼い猫を更新しました",
        });
      } else {
        await addPet(data.name, data.species);
        toast({
          title: "飼い猫を追加しました",
        });
      }
    } catch {
      toast({
        title: pet
          ? "飼い猫の更新に失敗しました"
          : "飼い猫の追加に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <Form {...form}>
        <DialogHeader>
          <DialogTitle>飼い猫を追加する</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>飼い猫の名前</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="name"
                      type="text"
                      placeholder="例：ミケ"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="species"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>猫種</FormLabel>
                  <Select
                    {...field}
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(Number(value))}
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
                </FormItem>
              )}
            />
          </div>
          <DialogFooter className="flex justify-end mt-4">
            <DialogClose asChild>
              <Button variant="secondary" onClick={handleClose}>
                キャンセル
              </Button>
            </DialogClose>
            {!pet ? (
              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            ) : (
              <>
                <Button
                  variant={"destructive"}
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "削除中..." : "削除"}
                </Button>
                <Button type="submit" variant="default" disabled={isSubmitting}>
                  {isSubmitting ? "更新中..." : "更新"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
