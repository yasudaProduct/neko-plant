import prisma from "@/lib/prisma";
import { STORAGE_PATH } from "@/lib/const";
import UserManagement from "./UserManagement";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserData } from "@/lib/user-data";

export default async function UsersAdmin() {
  // layout/middleware に加え、データ取得に最も近いここでも認可する (多層防御)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }
  const userData = await getUserData(user.id);
  if (!userData || userData.role !== "admin") {
    redirect("/");
  }

  const users = await prisma.public_users.findMany({
    orderBy: {
      created_at: "desc",
    },
    include: {
      _count: {
        select: {
          posts: true,
          post_likes: true,
          pets: true,
        },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ユーザー管理</h1>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          総ユーザー数: {users.length}人
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <UserManagement
              key={user.id}
              user={{
                id: user.id,
                name: user.name,
                aliasId: user.alias_id,
                image: user.image ? STORAGE_PATH.USER_PROFILE + user.image : null,
                role: user.role || 'user',
                createdAt: user.created_at,
                postCount: user._count.posts,
                likeCount: user._count.post_likes,
                petCount: user._count.pets,
              }}
            />
          ))}
        </ul>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">ユーザーが見つかりません</p>
        </div>
      )}
    </div>
  );
}