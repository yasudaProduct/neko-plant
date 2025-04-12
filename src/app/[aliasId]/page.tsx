import { createClient } from "@/lib/supabase/server";
import { BookHeart, Cat, Sprout } from "lucide-react";
import { redirect } from "next/navigation";
import AddPetDialogContent from "./AddPetDialogContent";
import {
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

  // お気に入り一覧取得
  const favoritePlants = await getUserFavoritePlants(userProfile.id);

  return (
    <div className="space-y-6">
      {/* 飼い猫一覧 */}
      <div className="lg:min-w-[500px] pt-6">
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
                <PlantContent key={plant.id} plant={plant} authFlg={false} />
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
                <FavoriteContent key={plant.id} plant={plant} authFlg={true} />
              ))
            : favoritePlants &&
              favoritePlants.map((plant) => (
                <FavoriteContent key={plant.id} plant={plant} authFlg={false} />
              ))}
        </div>
      </div>
    </div>
  );
}
