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
interface UserProfileProps {
  userProfile: UserProfile;
}

const userProfileSchema = z.object({
  name: z
    .string()
    .min(1, { message: "ユーザー名は必須です。" })
    .max(20, { message: "ユーザー名は7文字以内で入力してください。" }),
  aliasId: z
    .string()
    .min(1, { message: "表示名は必須です。" })
    .max(10, { message: "表示名は10文字以内で入力してください。" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "表示名は英数字で入力してください。" }),
  bio: z.string().optional(),
});

export default function AccountPageContent({ userProfile }: UserProfileProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const form = useForm<z.infer<typeof userProfileSchema>>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: userProfile.name,
      aliasId: userProfile.aliasId,
    },
  });

  const handleSubmit = async (formData: z.infer<typeof userProfileSchema>) => {
    try {
      setIsSubmitting(true);
      await updateUser(formData.name, formData.aliasId);

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
            src={userProfile.imageSrc ?? "/images/logo.jpg"}
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
                      <Input
                        id="username"
                        defaultValue={userProfile.name}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="max-w-full"
                      />
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
                      <Input
                        id="displayName"
                        defaultValue={userProfile.aliasId}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="max-w-full"
                      />
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
                        defaultValue={userProfile.bio}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="min-h-[150px] max-w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
