import { createClient } from "@/lib/supabase/server";
import { Cat, Image as ImageIcon } from "lucide-react";
import { redirect } from "next/navigation";
import AddPetDialogContent from "./AddPetDialogContent";
import {
  getUserPets,
  getUserPosts,
  getUserProfile,
} from "@/actions/user-action";
import { getNekoSpecies } from "@/actions/neko-action";
import { PetCard } from "./CardContent";
import Image from "next/image";
import Link from "next/link";

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

  const userPosts = await getUserPosts(userProfile.id);

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

      {/* 投稿一覧 */}
      <div className="lg:min-w-[500px] border-t pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="text-green-500" />
          投稿一覧
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userPosts?.map((post) => (
            <div key={post.id} className="rounded-lg border p-3 bg-white space-y-2">
              <Link href={`/plants/${post.plant.id}`} className="text-sm underline">
                {post.plant.name}
              </Link>
              {post.imageUrls[0] && (
                <div className="relative h-44 w-full overflow-hidden rounded-md">
                  <Image src={post.imageUrls[0]} alt={post.plant.name} fill className="object-cover" />
                </div>
              )}
              <p className="text-sm">{post.comment ?? "コメントなし"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
