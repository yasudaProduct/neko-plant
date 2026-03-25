"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserData } from "@/actions/user-action";
import prisma from "@/lib/prisma";

export async function updateUserRole(userId: number, role: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const userData = await getUserData(user.id);
  if (!userData || userData.role !== "admin") {
    throw new Error("管理者権限が必要です");
  }

  await prisma.public_users.update({
    where: {
      id: userId,
    },
    data: {
      role: role,
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteAdminPost(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const userData = await getUserData(user.id);
  if (!userData || userData.role !== "admin") {
    throw new Error("管理者権限が必要です");
  }

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    include: { post_images: true },
  });

  if (!post) {
    throw new Error("投稿が見つかりません");
  }

  // Storage 画像を削除
  for (const img of post.post_images) {
    await supabase.storage.from("posts").remove([img.image_url]);
  }

  await prisma.posts.delete({
    where: { id: postId },
  });

  revalidatePath("/admin/evaluations");
}
