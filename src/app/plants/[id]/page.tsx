import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RatingBar from "@/components/RatingBar";
import CommentForm from "./CommentForm";
import { getPlant } from "@/actions/plant-action";
import { getEvaluations } from "@/actions/evaluation-action";
import { Evaluation, EvaluationType } from "@/app/types/evaluation";
import { Plant } from "@/app/types/plant";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function PlantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plant: Plant | undefined = await getPlant(Number(id));
  if (!plant) {
    return notFound();
  }

  const evaluations: Evaluation[] = await getEvaluations(plant.id);

  // 評価をグループ化
  const goodEvaluations = evaluations.filter(
    (evaluation) => evaluation.type === EvaluationType.GOOD
  );
  const badEvaluations = evaluations.filter(
    (evaluation) => evaluation.type === EvaluationType.BAD
  );

  return (
    <div className="container mx-auto w-3/5">
      <div className="p-4">
        <Card className="overflow-hidden">
          <CardHeader className="p-0 relative">
            <Image
              src={plant.imageUrl ?? "/images/400x400.png"}
              alt="Monstera plant"
              width={600}
              height={400}
              className="w-full h-[300px] object-cover bg-gray-200"
            />
            {user?.id && (
              <div className="absolute top-2 right-2">
                <Link href={`/plants/${plant.id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">{plant.name}</h1>

            <RatingBar
              likes={goodEvaluations.length}
              dislikes={badEvaluations.length}
            />

            {/* Comments Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {goodEvaluations
                  .filter((evaluation) => evaluation.comment)
                  .map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                    >
                      <Avatar className="w-10 h-10">
                        {evaluation.pets?.map((pet) => (
                          <Image
                            key={pet.id}
                            src={pet.imageSrc ?? "/images/cat_default.png"}
                            alt={pet.name}
                            width={60}
                            height={60}
                            className="rounded-full"
                          />
                        ))}
                      </Avatar>
                      <span>{evaluation.comment}</span>
                    </div>
                  ))}
              </div>
              <div className="space-y-4">
                {badEvaluations
                  .filter((evaluation) => evaluation.comment)
                  .map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                    >
                      <Avatar className="w-10 h-10">
                        {evaluation.pets?.map((pet) => (
                          <Image
                            key={pet.id}
                            src={pet.imageSrc ?? "/images/cat_default.png"}
                            alt={pet.name}
                            width={60}
                            height={60}
                            className="rounded-full"
                          />
                        ))}
                      </Avatar>
                      <span>{evaluation.comment}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add comment form */}
        {user?.id && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">
              この植物についての評価を追加する
            </h2>
            <CommentForm plantId={plant.id} />
          </div>
        )}
      </div>
    </div>
  );
}
