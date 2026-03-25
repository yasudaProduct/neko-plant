import { createClient } from "@/lib/supabase/server";
import { Cat } from "lucide-react";
import { redirect } from "next/navigation";
import AddPetDialogContent from "./AddPetDialogContent";
import {
  getUserPets,
  getUserProfile,
} from "@/actions/user-action";
import { getNekoSpecies } from "@/actions/neko-action";
import { PetCard } from "./CardContent";

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

  const userProfile = await getUserProfile(aliasId);

  if (!userProfile) {
    redirect("/");
  }

  const pets = await getUserPets(userProfile.id);
  const neko_species = await getNekoSpecies();

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
    </div>
  );
}
