import { createClient } from "@/lib/supabase/server";
import {
  Cat,
  Heart,
  Pencil,
  Sprout,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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
import { Pet } from "../types/neko";
import PlantContent, { FavoriteContent } from "./CardContent";

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
                    <Dialog key={pet.id}>
                      <DialogTrigger asChild>
                        <PetCard pet={pet} authFlg={true} />
                      </DialogTrigger>
                      <AddPetDialogContent
                        pet={pet}
                        nekoSpecies={neko_species || []}
                      />
                    </Dialog>
                  ))
                : pets &&
                  pets.map((pet) => (
                    <PetCard key={pet.id} pet={pet} authFlg={false} />
                  ))}

              {user && userProfile.authId === user.id && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center"
                    >
                      <span className="text-gray-500">+ 新しい猫を追加</span>
                    </button>
                  </DialogTrigger>
                  <AddPetDialogContent nekoSpecies={neko_species || []} />
                </Dialog>
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
            {evaluations &&
              evaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg"
                >
                  {evaluation.type === "good" ? (
                    <ThumbsUp className="w-4 h-4" />
                  ) : (
                    <ThumbsDown className="w-4 h-4" />
                  )}
                  <p>{evaluation.comment}</p>
                </div>
              ))}
          </div>

          {/* お気に入り一覧 */}
          <div className="lg:min-w-[500px] border-t pt-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Heart className="text-red-500" />
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

interface PetCardProp {
  pet: Pet;
  authFlg: boolean;
}

function PetCard({ pet, authFlg }: PetCardProp) {
  return (
    <div
      className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
        authFlg ? "hover:border-green-500" : ""
      }`}
    >
      <div className="flex items-start space-x-4">
        <Image
          src={pet.imageSrc || "/images/cat_default.png"}
          alt={pet.name}
          width={80}
          height={80}
          className="w-20 h-20 rounded-lg object-cover"
        />
        <div>
          <h3 className="font-medium">{pet.name}</h3>
          <p className="text-sm text-gray-600">{pet.neko.name}</p>
          {/* {user && user_profiles.auth_id === user.id && (
            <button type="button" className="text-red-500 text-sm mt-2">
              削除
            </button>
          )} */}
        </div>
      </div>
    </div>
  );
}

// interface PlantCardProp {
//   plant: Plant;
//   authFlg: boolean;
// }

// function PlantCard({ plant, authFlg }: PlantCardProp) {
//   return (
//     <div
//       className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
//         authFlg ? "hover:border-green-500" : ""
//       }`}
//     >
//       <div className="flex items-start space-x-4">
//         <Image
//           src={plant.imageUrl || "/images/cat_default.png"}
//           alt={plant.name}
//           width={80}
//           height={80}
//           className="w-20 h-20 rounded-lg object-cover"
//         />
//         <div className="flex items-center justify-between w-full">
//           <h3 className="font-medium">{plant.name}</h3>
//           {authFlg && (
//             <button
//               type="button"
//               className="h-4 w-4 text-red-500"
//               onClick={() => {
//                 deleteHavePlant(plant.id);
//               }}
//             >
//               <X />
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
