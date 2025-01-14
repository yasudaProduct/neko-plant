import { createClient } from "@/lib/supabase/server";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AddPetDialogContent from "./AddPetDialogContent";

type Pet = {
  id: number;
  name: string;
  image: string;
  neko_id: number;
  neko: {
    id: number;
    name: string;
  };
};

export default async function ProfilePage({
  params,
}: {
  params: { alias_id: string };
}) {
  console.log("ProfilePage");
  const aliasId = params.alias_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ユーザー情報取得
  const { data: user_profiles } = await supabase
    .from("users")
    .select("id, auth_id, alias_id, name, image")
    .eq("alias_id", aliasId)
    .single();

  if (!user_profiles) {
    redirect("/");
  }

  // 飼い猫情報取得
  const { data: pets, error } = await supabase
    .from("pets")
    .select(
      `
      id, name, image, neko_id,
      neko!left (
        id,
        name
      )
      `
    )
    .eq("user_id", user_profiles.id)
    .returns<Pet[]>();

  console.log("pets", pets);
  console.log("error", error);

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-4 mb-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* <h1 className="text-2xl font-bold text-gray-800">ユーザー設定</h1> */}
        <div className="flex items-center justify-between mb-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">プロフィール</h2>
          {user && user_profiles.auth_id === user.id && (
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
            <img
              src={
                user_profiles?.image ||
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
              }
              alt="プロフィール画像"
              className="w-24 h-24 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold">
                {user_profiles?.name || "未設定"}
              </h2>
              <p className="text-gray-500">@{user_profiles?.alias_id}</p>
            </div>
          </div>

          <div className="lg:min-w-[500px] border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">飼い猫情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user && user_profiles.auth_id === user.id
                ? pets?.map((pet) => (
                    <Dialog key={pet.id}>
                      <DialogTrigger asChild>
                        <PetCard pet={pet} authFlg={true} />
                      </DialogTrigger>
                      <AddPetDialogContent
                        userId={user_profiles.id}
                        pet={pet}
                      />
                    </Dialog>
                  ))
                : pets?.map((pet) => <PetCard pet={pet} authFlg={false} />)}

              {user && user_profiles.auth_id === user.id && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center"
                    >
                      <span className="text-gray-500">+ 新しい猫を追加</span>
                    </button>
                  </DialogTrigger>
                  <AddPetDialogContent userId={user_profiles.id} />
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PetCardProp {
  pet: {
    id: number;
    name: string;
    image: string;
    neko_id: number;
    neko: {
      id: number;
      name: string;
    };
  };
  authFlg: boolean;
}

function PetCard({ pet, authFlg }: PetCardProp) {
  console.log("PetCard");
  console.log(pet);

  return (
    <div
      className={`min-w-full bg-gray-50 rounded-lg p-4 border-2 border-solid border-gray-50 ${
        authFlg ? "hover:border-green-500" : ""
      }`}
    >
      <div className="flex items-start space-x-4">
        <img
          src={
            pet.image ||
            "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=150"
          }
          alt={pet.name}
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
