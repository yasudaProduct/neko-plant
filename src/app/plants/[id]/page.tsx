import Image from "next/image";
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
import FavoriteButton from "./FavoriteButton";
import HaveButton from "./HaveButton";
import EvaluationCard from "./EvaluationCrad";

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold mb-4">{plant.name}</h1>
              {/* <div className="text-sm text-gray-500">{"test"}</div> */}
              <div className="ml-auto flex items-center gap-2">
                <FavoriteButton
                  plantId={plant.id}
                  isFavorite={plant.isFavorite}
                />
                <HaveButton plantId={plant.id} isHave={plant.isHave} />
              </div>
            </div>

            <RatingBar
              likes={goodEvaluations.length}
              dislikes={badEvaluations.length}
            />

            {/* Comments Grid */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  良い評価
                </h3>
                <div className="space-y-4 max-h-[300px] md:max-h-[500px] overflow-y-auto">
                  {goodEvaluations
                    .filter((evaluation) => evaluation.comment)
                    .map((evaluation) => (
                      <EvaluationCard
                        key={evaluation.id}
                        evaluation={evaluation}
                      />
                    ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  悪い評価
                </h3>
                <div className="space-y-4 max-h-[300px] md:max-h-[500px] overflow-y-auto">
                  {badEvaluations
                    .filter((evaluation) => evaluation.comment)
                    .map((evaluation) => (
                      <EvaluationCard
                        key={evaluation.id}
                        evaluation={evaluation}
                      />
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add comment form */}
        {user?.id && (
          <div className="mt-8">
            <CommentForm plantId={plant.id} />
          </div>
        )}
      </div>
    </div>
  );
}
