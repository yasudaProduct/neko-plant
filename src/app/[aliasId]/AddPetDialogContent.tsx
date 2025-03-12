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
import { NekoSpecies, Pet, SexType } from "../types/neko";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { addPet, deletePet, updatePet } from "@/actions/user-action";
import { toast } from "@/hooks/use-toast";
import { getImageData } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { DatePicker } from "@/components/ui/datepicker";
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
  sex: z.nativeEnum(SexType).optional(),
  age: z
    .preprocess(
      (val) => Number(val),
      z.number().min(0, {
        message: "年齢は0以上で入力してください。",
      })
    )
    .transform((val) => {
      if (!val) return undefined;
      const num = Number(val);
      if (isNaN(num)) throw new Error("年齢は数値で入力してください。");
      if (num < 0) throw new Error("年齢は0以上で入力してください。");
      return num;
    })
    .optional(),
  birthday: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, {
      message: "誕生日は YYYY/MM/DD 形式で入力してください。",
    })
    .optional(),
  image: z
    .any()
    .optional()
    .refine(
      (file) => file instanceof File || file === undefined,
      "有効な画像ファイルをアップロードしてください"
    )
    .refine(
      (file) =>
        file === undefined || ["image/jpeg", "image/png"].includes(file.type),
      {
        message: "サポートされていないファイル形式です",
      }
    )
    .refine((file) => file === undefined || file.size <= 5 * 1024 * 1024, {
      message: "ファイルサイズは5MB以下にしてください",
    }),
});

export default function AddPetDialogContent({
  pet,
  nekoSpecies,
}: AddPetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preview, setPreview] = useState("");
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: pet
      ? {
          name: pet.name,
          species: pet.neko.id,
          sex: pet.sex,
          age: pet.age,
          birthday: pet.birthday?.toISOString().split("T")[0],
        }
      : {
          name: "",
          species: 1,
          sex: undefined,
          age: undefined,
          birthday: undefined,
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files, displayUrl } = getImageData(e);
    if (files && files[0]) {
      form.setValue("image", files[0], { shouldValidate: true });
      setPreview(displayUrl);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      if (pet) {
        await updatePet(
          pet.id,
          data.name,
          data.species,
          data.image,
          data.sex,
          data.birthday,
          data.age
        );
        toast({
          title: "飼い猫を更新しました",
        });
      } else {
        await addPet(
          data.name,
          data.species,
          data.image,
          data.sex,
          data.birthday,
          data.age
        );
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
          <DialogTitle>
            {pet ? "飼い猫を更新する" : "飼い猫を追加する"}
          </DialogTitle>
          {pet && (
            <div className="flex items-center gap-2">
              <Avatar className="w-24 h-24">
                <Image
                  src={pet.imageSrc ?? "/images/cat_default.png"}
                  alt="プロフィール画像"
                  width={96}
                  height={96}
                />
                <AvatarFallback className="bg-muted"></AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{pet.name}</h2>
                <p className="text-gray-500">{pet.neko.name}</p>
              </div>
            </div>
          )}
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
                  <FormMessage />
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <label htmlFor="image" className="block text-sm font-medium">
              新しいプロフィール画像
            </label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {form.formState.errors.image && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.image.message as string}
              </p>
            )}

            <div className="aspect-video max-w-[560px] flex justify-center items-center">
              {preview ? (
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={preview}
                    alt="プロフィール画像"
                    width={96}
                    height={96}
                  />
                  <AvatarFallback className="bg-muted"></AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-full h-full bg-background/70 rounded-lg border flex justify-center items-center"></div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>性別</FormLabel>
                    <Select
                      {...field}
                      value={field.value?.toString() ?? ""}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="性別を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SexType.MALE}>おとこのこ</SelectItem>
                        <SelectItem value={SexType.FEMALE}>
                          おんなのこ
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>年齢</FormLabel>
                    <Input {...field} type="number" placeholder="例：3" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>誕生日</FormLabel>
                    <DatePicker field={field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
