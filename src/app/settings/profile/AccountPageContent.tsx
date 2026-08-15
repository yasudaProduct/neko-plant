"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProfileImageUploadModal from "./ProfileImageUploadModal";
import { UserProfile } from "@/types/user";
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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import Image from "next/image";
import { updateUser } from "@/actions/user-action";
import { MAX_USER_BIO_LENGTH } from "@/lib/const";
interface UserProfileProps {
  userProfile: UserProfile;
}

const userProfileSchema = z.object({
  name: z
    .string()
    .min(1, { message: "ユーザー名は必須です。" })
    .max(20, { message: "ユーザー名は20文字以内で入力してください。" }),
  aliasId: z
    .string()
    .min(1, { message: "ユーザーIDは必須です。" })
    .max(10, { message: "ユーザーIDは10文字以内で入力してください。" })
    // サーバー側 (updateUser) の検証と一致させる (数字を許すとサーバーで弾かれ原因が伝わらない)
    .regex(/^[a-zA-Z]+$/, { message: "ユーザーIDは半角英字で入力してください。" }),
  bio: z
    .string()
    .max(MAX_USER_BIO_LENGTH, {
      message: `自己紹介は${MAX_USER_BIO_LENGTH}文字以内で入力してください。`,
    })
    .optional(),
});

export default function AccountPageContent({ userProfile }: UserProfileProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const form = useForm<z.infer<typeof userProfileSchema>>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: userProfile.name,
      aliasId: userProfile.aliasId,
      bio: userProfile.bio ?? "",
    },
  });

  const handleSubmit = async (formData: z.infer<typeof userProfileSchema>) => {
    try {
      setIsSubmitting(true);
      await updateUser(formData.name, formData.aliasId, formData.bio);

      success({
        title: "更新しました",
      });
    } catch {
      error({
        title: "更新に失敗しました",
        description:
          "再度試していただくか、サイト管理者にお問い合わせください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 space-y-8">
      <div className="flex flex-col items-center gap-2">
        <Avatar className="w-24 h-24">
          <Image
            src={userProfile.imageSrc ?? "/images/logo.png"}
            alt="プロフィール画像"
            width={96}
            height={96}
            className="rounded-full"
          />
        </Avatar>
        <ProfileImageUploadModal userId={userProfile.aliasId} />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名前</FormLabel>
                    <FormControl>
                      <Input id="username" className="max-w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormField
                control={form.control}
                name="aliasId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ユーザーID</FormLabel>
                    <FormControl>
                      <Input id="displayName" className="max-w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>自己紹介</FormLabel>
                    <FormControl>
                      <Textarea
                        id="bio"
                        className="min-h-[150px] max-w-full"
                        maxLength={MAX_USER_BIO_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-500 hover:bg-green-600"
            >
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
