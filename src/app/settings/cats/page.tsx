import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPets, getUserProfileByAuthId } from "@/actions/user-action";
import { getNekoSpecies } from "@/actions/neko-action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PetFormDialog from "./PetFormDialog";

export const metadata: Metadata = {
  title: "猫プロフィール | 猫と植物",
};

export default async function CatsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const profile = await getUserProfileByAuthId();

  if (!profile) {
    redirect("/signin");
  }

  const [pets, nekoSpecies] = await Promise.all([
    getUserPets(profile.id),
    getNekoSpecies(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">猫プロフィール</h2>
        <p className="text-sm text-gray-600">登録した猫は、投稿するときに選択できます。</p>
      </div>

      <div className="flex flex-col gap-3">
        {(pets ?? []).map((pet) => (
          <div
            key={pet.id}
            className="bg-white rounded-xl border border-border shadow-sm p-5 flex items-center gap-3.5"
            data-testid="pet-card"
          >
            <Avatar className="w-14 h-14">
              <AvatarImage src={pet.imageSrc} alt={pet.name} />
              <AvatarFallback>{pet.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-base font-bold text-gray-900">{pet.name}</span>
              <span className="text-xs text-gray-500">
                {pet.neko.name}
                {pet.age != null && ` ・ ${pet.age}歳`}
              </span>
            </div>
            <PetFormDialog
              pet={pet}
              nekoSpecies={nekoSpecies}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="w-3.5 h-3.5" />
                  編集
                </Button>
              }
            />
          </div>
        ))}

        <PetFormDialog
          nekoSpecies={nekoSpecies}
          trigger={
            <button
              type="button"
              className="flex items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm hover:border-green-500 hover:text-green-700 transition-colors"
              data-testid="add-pet-button"
            >
              <Plus className="w-[18px] h-[18px]" />
              猫を追加する
            </button>
          }
        />
      </div>
    </div>
  );
}
