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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NekoSpecies, Pet, SexType } from "../../types/neko";
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
import { useToast } from "@/hooks/use-toast";
import { getImageData } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { DatePicker } from "@/components/ui/datepicker";
import { PetCard } from "./CardContent";
import { Cat } from "lucide-react";
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
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preview, setPreview] = useState<string>(pet?.imageSrc || "");
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: pet?.name || "",
      species: pet?.neko.id || 1,
      sex: pet?.sex || undefined,
      age: pet?.age || undefined,
      birthday: pet?.birthday
        ? pet.birthday.toISOString().split("T")[0].replace(/-/g, "/")
        : "",
      image: undefined,
    },
  });

  const handleDelete = async () => {
    if (!pet) {
      return;
    }

    setIsDeleting(true);

    try {
      await deletePet(pet.id);
      success({
        title: "飼い猫を削除しました",
      });
      setIsOpen(false);
    } catch {
      error({
        title: "飼い猫の削除に失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    form.reset();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files, displayUrls } = getImageData(e);
    if (files && files.length > 0) {
      if (files.length >= 2) {
        alert(`最大1枚までしかアップロードできません。`);
        return;
      }
      form.setValue("image", files[0], { shouldValidate: true });
      setPreview(displayUrls[0]);
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
        success({
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
        success({
          title: "飼い猫を追加しました",
        });
      }
      setIsOpen(false);
    } catch {
      error({
        title: pet
          ? "飼い猫の更新に失敗しました"
          : "飼い猫の追加に失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setIsSubmitting(false);
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {pet ? (
          <button type="button">
            <PetCard pet={pet} authFlg={true} />
          </button>
        ) : (
          <button
            type="button"
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center"
          >
            <span className="text-gray-500">+ 新しい飼い猫を追加</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <DialogHeader>
            <DialogTitle>
              {pet ? "飼い猫を更新する" : "飼い猫を追加する"}
            </DialogTitle>
            {pet && (
              <div className="flex items-center gap-2">
                {pet.imageSrc ? (
                  <Avatar className="w-24 h-24">
                    <Image
                      src={pet.imageSrc}
                      alt="プロフィール画像"
                      width={96}
                      height={96}
                    />
                  </Avatar>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Cat className="w-10 h-10 text-gray-400" />
                  </div>
                )}
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
                className="hover:cursor-pointer"
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
                          <SelectItem value={SexType.MALE}>
                            おとこのこ
                          </SelectItem>
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
                      <Input
                        {...field}
                        type="number"
                        placeholder="例：3"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : ""
                          )
                        }
                      />
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
                <Button variant="outline" onClick={handleClose}>
                  キャンセル
                </Button>
              </DialogClose>
              {!pet ? (
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmitting}
                  className="bg-green-500 hover:bg-green-600"
                >
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
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "更新中..." : "更新"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
