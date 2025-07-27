import prisma from "@/lib/prisma";
import { STORAGE_PATH } from "@/lib/const";
import UserManagement from "./UserManagement";

export default async function UsersAdmin() {
  const users = await prisma.public_users.findMany({
    orderBy: {
      created_at: "desc",
    },
    include: {
      _count: {
        select: {
          evaluations: true,
          plant_images: true,
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
                evaluationCount: user._count.evaluations,
                imageCount: user._count.plant_images,
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