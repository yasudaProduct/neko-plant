import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const [totalUsers, totalPlants, totalEvaluations, pendingImages] = await Promise.all([
    prisma.public_users.count(),
    prisma.plants.count(),
    prisma.evaluations.count(),
    prisma.plant_images.count({
      where: {
        is_approved: false,
      },
    }),
  ]);

  const recentEvaluations = await prisma.evaluations.findMany({
    take: 5,
    orderBy: {
      created_at: "desc",
    },
    include: {
      plants: true,
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
            <CardTitle className="text-sm font-medium">総評価数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvaluations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認待ち画像</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingImages}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近の評価</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEvaluations.map((evaluation) => (
              <div key={evaluation.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{evaluation.plants.name}</p>
                  <p className="text-sm text-gray-500">
                    {evaluation.users?.name || "Unknown User"} - {evaluation.type === "good" ? "良い評価" : "悪い評価"}
                  </p>
                  {evaluation.comment && (
                    <p className="text-sm text-gray-600 mt-1">{evaluation.comment}</p>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(evaluation.created_at).toLocaleDateString("ja-JP")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}