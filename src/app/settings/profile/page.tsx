import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountPageContent from "./AccountPageContent";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: user_profiles } = await supabase
    .from("users")
    .select("auth_id, alias_id, name, image")
    .eq("auth_id", user.id)
    .single();

  if (!user_profiles) {
    redirect("/signin");
  }

  return (
    <AccountPageContent
      userProfiles={{
        id: user_profiles.auth_id,
        name: user_profiles.name,
        image: user_profiles.image,
        alias_id: user_profiles.alias_id,
        // bio: user_profiles.bio,
      }}
    />
  );
}
