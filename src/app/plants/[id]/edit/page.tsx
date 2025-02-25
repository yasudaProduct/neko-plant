import { getPlant } from "@/actions/plant-action";
import { Card, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlantEditForm from "./PlantEditForm";
import Image from "next/image";
export default async function EditPlant({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const plant = await getPlant(parseInt(id));
  if (!plant) {
    redirect("/plants");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-center mb-6">植物を編集</h1>
          <CardHeader>
            <Image
              src={plant.imageUrl ?? "/images/400x400.png"}
              alt="Monstera plant"
              width={600}
              height={400}
              className="w-full h-[300px] object-cover bg-gray-200"
            />
          </CardHeader>
          <PlantEditForm plant={plant} />
        </Card>
      </div>
    </div>
  );
}
