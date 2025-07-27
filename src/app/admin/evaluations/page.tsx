import prisma from "@/lib/prisma";
import EvaluationManagement from "./EvaluationManagement";

export default async function EvaluationsAdmin() {
  const evaluations = await prisma.evaluations.findMany({
    orderBy: {
      created_at: "desc",
    },
    include: {
      plants: true,
      users: true,
      _count: {
        select: {
          evaluation_reactions: true,
        },
      },
    },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">評価管理</h1>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          最新の評価 {evaluations.length}件を表示中
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {evaluations.map((evaluation) => (
            <EvaluationManagement
              key={evaluation.id}
              evaluation={{
                id: evaluation.id,
                type: evaluation.type as "good" | "bad",
                comment: evaluation.comment,
                createdAt: evaluation.created_at,
                reactionCount: evaluation._count.evaluation_reactions,
                plant: {
                  id: evaluation.plants.id,
                  name: evaluation.plants.name,
                },
                user: evaluation.users ? {
                  id: evaluation.users.id,
                  name: evaluation.users.name,
                  aliasId: evaluation.users.alias_id,
                } : null,
              }}
            />
          ))}
        </ul>
      </div>

      {evaluations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">評価が見つかりません</p>
        </div>
      )}
    </div>
  );
}