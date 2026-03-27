"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserData } from "@/actions/user-action";
import prisma from "@/lib/prisma";

export async function approveImage(imageId: number) {
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

  const image = await prisma.post_images.findUnique({
    where: { id: imageId },
  });
  if (!image) {
    throw new Error("画像が見つかりません");
  }
  // v2では承認状態を持たないため、承認操作は再検証のみ行う
  revalidatePath("/admin/posts");
}

export async function rejectImage(imageId: number) {
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

  await prisma.post_images.delete({
    where: {
      id: imageId,
    },
  });

  revalidatePath("/admin/posts");
}

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

export async function deleteEvaluation(evaluationId: number) {
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

  await prisma.posts.delete({
    where: {
      id: evaluationId,
    },
  });

  revalidatePath("/admin/posts");
}