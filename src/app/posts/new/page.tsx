import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserPets, getUserProfileByAuthId } from "@/actions/user-action";
import { getNekoSpecies } from "@/actions/neko-action";
import PostFlow from "./PostFlow";

export const metadata: Metadata = {
  title: "投稿する",
};

export default async function NewPostPage() {
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
    getUserPets(profile.id).then((result) => result ?? []),
    getNekoSpecies(),
  ]);

  return <PostFlow myPets={pets} nekoSpecies={nekoSpecies} />;
}
