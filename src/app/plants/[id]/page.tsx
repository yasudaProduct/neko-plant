import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RatingBar from "@/components/RatingBar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default async function PlantPage({
  params,
}: {
  params: { id: number };
}) {
  console.log("PlantPage");
  const id = params.id;

  const supabase = await createClient();
  const { data: plant } = await supabase
    .from("plants")
    .select("id, name, image")
    .eq("id", id)
    .single();

  if (!plant) {
    return <div>Plant not found</div>;
  }

  const { error, data: evaluations } = await supabase
    .from("evaluations")
    .select("id, type, comment")
    .eq("plant_id", id);
  // .order("created_at", { ascending: false });

  console.log("id", id);
  console.log("evaluations", evaluations);
  console.log("error", error);

  return (
    <div className="container mx-auto">
      <div className="p-4">
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
            <Image
              src={plant.image ?? "https://placehold.jp/400x400.png"}
              alt="Monstera plant"
              width={600}
              height={400}
              className="w-full h-[300px] object-cover bg-gray-200"
            />
          </CardHeader>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">{plant.name}</h1>

            <RatingBar likes={100} dislikes={25} />

            {/* Comments Grid */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluations?.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span>{evaluation.comment}</span>
                  </div>
                </div>
              ))}
            </div> */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {evaluations
                  ?.filter((evaluation) => evaluation.type === "good")
                  .map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <span>{evaluation.comment}</span>
                    </div>
                  ))}
              </div>
              <div className="space-y-4">
                {evaluations
                  ?.filter((evaluation) => evaluation.type === "bad")
                  .map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <span>{evaluation.comment}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add comment form */}
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">
            この植物についての評価を追加する
          </h2>
          <form>
            <Textarea className="w-full h-24 p-2 border rounded-md" />
            <Button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md">
              <ThumbsUp className="w-4 h-4" />
              Good
            </Button>
            <Button className="mt-2 bg-red-500 text-white px-4 py-2 rounded-md">
              <ThumbsDown className="w-4 h-4" />
              Bad
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
