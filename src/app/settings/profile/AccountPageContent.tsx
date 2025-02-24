"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProfileImageUploadModal from "./ProfileImageUploadModal";
import { updateUser } from "@/actions/user-action";
import { UserProfile } from "@/app/types/user";
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
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { UserIcon } from "lucide-react";
interface UserProfileProps {
  userProfile: UserProfile;
}

const userProfileSchema = z.object({
  name: z.string().min(1, { message: "ユーザー名は必須です。" }),
  aliasId: z.string().min(1, { message: "表示名は必須です。" }),
  bio: z.string().optional(),
});

export default function AccountPageContent({ userProfile }: UserProfileProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await updateUser(formData.name, formData.aliasId, formData.bio);
      toast({
        title: "更新しました",
      });
    } catch {
      toast({
        title: "更新に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 space-y-8">
      <div className="flex flex-col items-center gap-2">
        <Avatar className="w-24 h-24">
          <AvatarImage
            src={userProfile.imageSrc ?? "/images/cat_default.png"}
            alt="プロフィール画像"
            width={96}
            height={96}
          />
          <AvatarFallback className="bg-muted">
            <UserIcon className="w-4 h-4" />
          </AvatarFallback>
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
                    <FormLabel>ユーザー名</FormLabel>
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
                    <FormLabel>表示名</FormLabel>
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
