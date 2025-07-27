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

  await prisma.plant_images.update({
    where: {
      id: imageId,
    },
    data: {
      is_approved: true,
    },
  });

  revalidatePath("/admin/plant-images");
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

  await prisma.plant_images.delete({
    where: {
      id: imageId,
    },
  });

  revalidatePath("/admin/plant-images");
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

  await prisma.evaluations.delete({
    where: {
      id: evaluationId,
    },
  });

  revalidatePath("/admin/evaluations");
}