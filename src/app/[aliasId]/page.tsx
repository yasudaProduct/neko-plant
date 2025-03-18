import { createClient } from "@/lib/supabase/server";
import {
  BookHeart,
  Cat,
  Heart,
  Pencil,
  Skull,
  Sprout,
  Star,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import AddPetDialogContent from "./AddPetDialogContent";
import {
  getUserEvaluations,
  getUserFavoritePlants,
  getUserPets,
  getUserPlants,
  getUserProfile,
} from "@/actions/user-action";
import { getNekoSpecies } from "@/actions/neko-action";
import PlantContent, { FavoriteContent, PetCard } from "./CardContent";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ aliasId: string }>;
}) {
  const { aliasId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ユーザー情報取得
  const userProfile = await getUserProfile(aliasId);

  if (!userProfile) {
    redirect("/");
  }

  // 飼い猫情報取得
  const pets = await getUserPets(userProfile.id);

  // 猫種一覧取得
  const neko_species = await getNekoSpecies();

  // 飼い植物一覧取得
  const havePlants = await getUserPlants(userProfile.id);

  // 評価一覧取得
  const evaluations = await getUserEvaluations(userProfile.id);

  // お気に入り一覧取得
  const favoritePlants = await getUserFavoritePlants(userProfile.id);

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-4 mb-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">プロフィール</h2>
          {user && userProfile.authId === user.id && (
            <Link
              href="/settings/profile"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
            >
              <Pencil className="w-4 h-4" />
              <span>編集</span>
            </Link>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Image
              src={userProfile?.imageSrc || "/images/cat_default.png"}
              alt="プロフィール画像"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold">
                {userProfile?.name || "未設定"}
              </h2>
              <p className="text-gray-500">@{userProfile?.aliasId}</p>
            </div>
          </div>

          {/* 飼い猫一覧 */}
          <div className="lg:min-w-[500px] border-t pt-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Cat className="text-gray-500" />
              飼い猫情報
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user && userProfile.authId === user.id
                ? pets &&
                  pets.map((pet) => (
                    <AddPetDialogContent
                      key={pet.id}
                      pet={pet}
                      nekoSpecies={neko_species || []}
                    />
                  ))
                : pets &&
                  pets.map((pet) => (
                    <PetCard key={pet.id} pet={pet} authFlg={false} />
                  ))}

              {user && userProfile.authId === user.id && (
                <AddPetDialogContent nekoSpecies={neko_species || []} />
              )}
            </div>
          </div>

          {/* 飼い植物一覧 */}
          <div className="lg:min-w-[500px] border-t pt-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sprout className="text-green-500" />
              飼ってる植物
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user && userProfile.authId === user.id
                ? havePlants &&
                  havePlants.map((plant) => (
                    <PlantContent key={plant.id} plant={plant} authFlg={true} />
                  ))
                : havePlants &&
                  havePlants.map((plant) => (
                    <PlantContent
                      key={plant.id}
                      plant={plant}
                      authFlg={false}
                    />
                  ))}
            </div>
          </div>

          {/* 評価一覧 */}
          <div className="lg:min-w-[500px] border-t pt-6">
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
                      <p>{evaluation.plant.name}</p>
                    </Link>
                  </div>
                ))}
            </div>
          </div>

          {/* お気に入り一覧 */}
          <div className="lg:min-w-[500px] border-t pt-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookHeart className="text-red-500" />
              お気に入り一覧
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user && userProfile.authId === user.id
                ? favoritePlants &&
                  favoritePlants.map((plant) => (
                    <FavoriteContent
                      key={plant.id}
                      plant={plant}
                      authFlg={true}
                    />
                  ))
                : favoritePlants &&
                  favoritePlants.map((plant) => (
                    <FavoriteContent
                      key={plant.id}
                      plant={plant}
                      authFlg={false}
                    />
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
