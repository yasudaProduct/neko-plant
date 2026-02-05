import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewPostWithAiForm from "./NewPostWithAiForm";
import { Card } from "@/components/ui/card";

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            写真から評価を投稿
          </h1>
          <NewPostWithAiForm />
        </Card>
      </div>
    </div>
  );
}

