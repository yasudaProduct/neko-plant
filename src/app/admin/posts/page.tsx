import prisma from "@/lib/prisma";
import EvaluationManagement from "../evaluations/EvaluationManagement";

export default async function PostsAdmin() {
  const posts = await prisma.posts.findMany({
    orderBy: { created_at: "desc" },
    include: {
      plants: true,
      users: true,
      _count: { select: { post_likes: true } },
    },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">投稿管理</h1>
      <div className="mb-4">
        <p className="text-sm text-gray-600">最新の投稿 {posts.length}件を表示中</p>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {posts.map((post) => (
            <EvaluationManagement
              key={post.id}
              evaluation={{
                id: post.id,
                comment: post.comment,
                createdAt: post.created_at,
                reactionCount: post._count.post_likes,
                plant: { id: post.plants.id, name: post.plants.name },
                user: post.users
                  ? { id: post.users.id, name: post.users.name, aliasId: post.users.alias_id }
                  : null,
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
