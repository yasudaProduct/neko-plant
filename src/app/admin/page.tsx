import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserData } from "@/lib/user-data";

export default async function AdminDashboard() {
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

  const [totalUsers, totalPlants, totalPosts, totalLikes] = await Promise.all([
    prisma.public_users.count(),
    prisma.plants.count(),
    prisma.posts.count(),
    prisma.post_likes.count(),
  ]);

  const recentPosts = await prisma.posts.findMany({
    take: 5,
    orderBy: {
      created_at: "desc",
    },
    include: {
      post_plants: {
        include: { plants: true },
      },
      users: true,
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ダッシュボード</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総植物数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総投稿数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総いいね数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近の投稿</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <Link href={`/posts/${post.id}`} className="font-medium hover:underline">
                    {post.post_plants.map((postPlant) => postPlant.plants.name).join("・") ||
                      "植物タグなし"}
                  </Link>
                  <p className="text-sm text-gray-500">{post.users?.name || "Unknown User"}</p>
                  {post.comment && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.comment}</p>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(post.created_at).toLocaleDateString("ja-JP")}
                </div>
              </div>
            ))}
            {recentPosts.length === 0 && (
              <p className="text-sm text-gray-500">投稿がまだありません</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
