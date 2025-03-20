import { redirect } from "next/navigation";
import AccountPageContent from "./AccountPageContent";
import { getUserProfileByAuthId } from "@/actions/user-action";
import { UserProfile } from "@/types/user";
import { createClient } from "@/lib/supabase/server";
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const userProfile: UserProfile | undefined = await getUserProfileByAuthId();
  console.log(userProfile);

  if (!userProfile) {
    redirect("/signin");
  }

  console.log(userProfile);

  return <AccountPageContent userProfile={userProfile} />;
}
