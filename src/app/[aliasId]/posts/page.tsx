import { Heart, Skull, Star, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { getUserEvaluations, getUserProfile } from "@/actions/user-action";
import { notFound } from "next/navigation";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ aliasId: string }>;
}) {
  const { aliasId } = await params;

  // ユーザー情報取得
  const userProfile = await getUserProfile(aliasId);
  if (!userProfile) {
    return notFound();
  }

  // 投稿評価一覧取得
  const evaluations = await getUserEvaluations(userProfile.id);

  // 投稿画像一覧取得
  //   const posts = await getUserPosts(userProfile.id);

  return (
    <div className="space-y-6">
      {/* 評価一覧 */}
      <div className="lg:min-w-[500px] pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Star className="text-yellow-500" />
          評価一覧
        </h2>
        <div className="overflow-y-auto max-h-[300px]">
          {evaluations &&
            evaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg mb-4 hover:bg-gray-100 transition-colors"
              >
                {evaluation.type === "good" ? (
                  <Heart className="w-4 h-4 text-red-500" />
                ) : (
                  <Skull className="w-4 h-4 text-indigo-500" />
                )}
                <p>{evaluation.comment}</p>
                <Link href={`/plants/${evaluation.plant.id}`}>
                  <p className="text-sm hover:cursor-pointer">
                    {"[" + evaluation.plant.name + "]"}
                  </p>
                </Link>
              </div>
            ))}
        </div>
      </div>

      {/* 投稿一覧 */}
      <div className="lg:min-w-[500px] pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="text-green-500" />
          投稿一覧
        </h2>
        <div className="overflow-y-auto max-h-[300px]">
          {/* {evaluations &&
            evaluations.map((evaluation) => (
              <div key={evaluation.id}>
                <Image
                  src={evaluation.plant.image}
                  alt="投稿画像"
                  width={100}
                  height={100}
                />
              </div>
            ))} */}
        </div>
      </div>
    </div>
  );
}
