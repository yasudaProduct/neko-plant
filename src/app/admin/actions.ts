"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserData } from "@/lib/user-data";
import prisma from "@/lib/prisma";

const VALID_ROLES = ["user", "admin", "moderator"] as const;

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

  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    throw new Error("不正なロールです");
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
