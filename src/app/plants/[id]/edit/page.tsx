import { getPlant } from "@/actions/plant-action";
import { Card, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlantEditForm from "./PlantEditForm";
import Image from "next/image";
import { Leaf } from "lucide-react";
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
            {plant.imageUrl ? (
              <Image
                src={plant.imageUrl}
                alt={plant.name}
                width={600}
                height={400}
                className="w-full h-[300px] object-contain bg-gray-100"
                quality={90}
                priority
              />
            ) : (
              <div className="w-full h-[300px] bg-gray-100 flex items-center justify-center">
                <Leaf className="w-10 h-10 text-gray-400" />
                <span className="text-gray-400 ml-2">No image</span>
              </div>
            )}
          </CardHeader>
          <PlantEditForm plant={plant} />
        </Card>
      </div>
    </div>
  );
}
