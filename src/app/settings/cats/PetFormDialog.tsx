"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { NekoSpecies, Pet, SexType } from "@/types/neko";
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
import {
  processImageForUpload,
  removeUploadedImagesBestEffort,
  uploadImagesToBucket,
} from "@/lib/client-image";
import { createClient } from "@/lib/supabase/client";
import { MAX_PET_NAME_LENGTH, MAX_UPLOAD_SOURCE_IMAGE_SIZE } from "@/lib/const";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/datepicker";

type Props = {
  pet?: Pet;
  nekoSpecies: NekoSpecies[];
  trigger: React.ReactNode;
  /** 新規作成が成功した直後に呼ばれる (投稿フローでその場登録した猫を即座に選択状態にするため) */
  onCreated?: (pet: Pet) => void;
};

const formSchema = z.object({
  name: z.string().min(1, {
    message: "名前は必須です。",
  }).max(MAX_PET_NAME_LENGTH, {
    message: `名前は${MAX_PET_NAME_LENGTH}文字以内で入力してください。`,
  }),
  species: z.number().min(1, {
    message: "猫種を選択してください。",
  }),
  sex: z.nativeEnum(SexType).optional(),
  age: z
    .preprocess(
      (val) => (val === "" || val === undefined ? undefined : Number(val)),
      z.number().min(0, { message: "年齢は0以上で入力してください。" }).optional()
    ),
  birthday: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, {
      message: "誕生日は YYYY/MM/DD 形式で入力してください。",
    })
    .optional()
    .or(z.literal("")),
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
      { message: "サポートされていないファイル形式です" }
    )
    .refine((file) => file === undefined || file.size <= MAX_UPLOAD_SOURCE_IMAGE_SIZE, {
      message: "ファイルサイズは20MB以下にしてください",
    }),
});

/** 猫プロフィールの追加・編集ダイアログ */
export default function PetFormDialog({ pet, nekoSpecies, trigger, onCreated }: Props) {
  const { success, error } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preview, setPreview] = useState<string>(pet?.imageSrc || "");
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: pet?.name || "",
      species: pet?.neko.id || nekoSpecies[0]?.id || 1,
      sex: pet?.sex || undefined,
      age: pet?.age ?? undefined,
      birthday: pet?.birthday
        ? pet.birthday.toISOString().split("T")[0].replace(/-/g, "/")
        : "",
      image: undefined,
    },
  });

  const handleDelete = async () => {
    if (!pet) return;

    setIsDeleting(true);
    try {
      await deletePet(pet.id);
      success({ title: "猫プロフィールを削除しました" });
      setIsOpen(false);
      router.refresh();
    } catch {
      error({
        title: "猫プロフィールの削除に失敗しました",
        description: "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files, displayUrls } = getImageData(e);
    if (files && files.length > 0) {
      form.setValue("image", files[0], { shouldValidate: true });
      setPreview(displayUrls[0]);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    let imagePath: string | undefined;
    try {
      // 画像があれば縮小 + JPEG再エンコード (Exif除去) してブラウザから直接アップロードする
      if (data.image) {
        const processed = await processImageForUpload(data.image);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("ログインが必要です。");
        }

        imagePath = `${user.id}/pet_${crypto.randomUUID()}.jpg`;
        await uploadImagesToBucket("user_pets", [{ path: imagePath, file: processed }]);
      }

      if (pet) {
        const result = await updatePet(
          pet.id,
          data.name,
          data.species,
          imagePath,
          data.sex,
          data.birthday || undefined,
          data.age
        );
        if (!result.success) {
          await removeUploadedImagesBestEffort("user_pets", imagePath ? [imagePath] : []);
          error({
            title: "猫プロフィールの更新に失敗しました",
            description: result.message,
          });
          return;
        }
        success({ title: "猫プロフィールを更新しました" });
      } else {
        const result = await addPet(
          data.name,
          data.species,
          imagePath,
          data.sex,
          data.birthday || undefined,
          data.age
        );
        if (!result.success) {
          await removeUploadedImagesBestEffort("user_pets", imagePath ? [imagePath] : []);
          error({
            title: "猫の追加に失敗しました",
            description: result.message,
          });
          return;
        }
        const species = nekoSpecies.find((s) => s.id === data.species);
        if (species && result.data) {
          onCreated?.({
            id: result.data.petId,
            name: data.name,
            neko: species,
            sex: data.sex,
            age: data.age,
            birthday: data.birthday ? new Date(data.birthday) : undefined,
            imageSrc: preview || undefined,
          });
        }
        success({ title: "猫を追加しました" });
      }
      setIsOpen(false);
      form.reset();
      router.refresh();
    } catch {
      await removeUploadedImagesBestEffort("user_pets", imagePath ? [imagePath] : []);
      error({
        title: pet ? "猫プロフィールの更新に失敗しました" : "猫の追加に失敗しました",
        description: "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <DialogHeader>
            <DialogTitle>{pet ? "猫プロフィールを編集" : "猫を追加"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="flex justify-center">
                <label className="relative cursor-pointer" title="画像を選択">
                  <Avatar className="w-[72px] h-[72px]">
                    <AvatarImage src={preview || undefined} alt={pet?.name || "猫"} />
                    <AvatarFallback>{(form.watch("name") || "猫").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -right-1 -bottom-1 flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white border-2 border-white text-xs">
                    +
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              {form.formState.errors.image && (
                <p className="text-red-500 text-sm text-center">
                  {form.formState.errors.image.message as string}
                </p>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名前</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="例: レオ" data-testid="pet-name-input" />
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
                    <FormLabel>種類</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger data-testid="pet-species-select">
                        <SelectValue placeholder="猫種を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {nekoSpecies.map((species) => (
                          <SelectItem key={species.id} value={species.id.toString()}>
                            {species.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>性別（任意）</FormLabel>
                      <Select
                        value={field.value?.toString() ?? ""}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="性別を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SexType.MALE}>おとこのこ</SelectItem>
                          <SelectItem value={SexType.FEMALE}>おんなのこ</SelectItem>
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
                      <FormLabel>年齢（任意）</FormLabel>
                      <Input
                        type="number"
                        placeholder="例: 3"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>誕生日（任意）</FormLabel>
                    <DatePicker field={field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex justify-end mt-5 gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  キャンセル
                </Button>
              </DialogClose>
              {pet && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "削除中..." : "削除"}
                </Button>
              )}
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
                data-testid="pet-save-button"
              >
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
