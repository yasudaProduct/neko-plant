import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RatingBar from "@/components/RatingBar";
import { getPlant, getPlantImages } from "@/actions/plant-action";
import { getEvaluations } from "@/actions/evaluation-action";
import { Evaluation, EvaluationType } from "@/types/evaluation";
import { Plant } from "@/types/plant";
import { notFound } from "next/navigation";
import { Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import FavoriteButton from "./FavoriteButton";
import HaveButton from "./HaveButton";
import EvaluationCard from "./EvaluationCrad";
import CommentFormDialog from "./CommentFormDialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

  // 植物を取得
  const plant: Plant | undefined = await getPlant(Number(id));
  if (!plant) {
    return notFound();
  }

  // 評価を取得
  const evaluations: Evaluation[] = await getEvaluations(plant.id);

  // 評価をグループ化
  const goodEvaluations = evaluations.filter(
    (evaluation) => evaluation.type === EvaluationType.GOOD
  );
  const badEvaluations = evaluations.filter(
    (evaluation) => evaluation.type === EvaluationType.BAD
  );

  // 植物画像を取得
  const plantImages: string[] | undefined = await getPlantImages(plant.id);

  return (
    <div className="container mx-auto w-full 2xl:w-3/5">
      <div className="p-4">
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
            {plantImages && Array.isArray(plantImages) ? (
              <Carousel>
                <CarouselContent>
                  {plantImages.map((imageUrl) => (
                    <CarouselItem key={imageUrl}>
                      <div className="w-full h-[300px] relative">
                        <Image
                          key={`blur-${imageUrl}`}
                          src={imageUrl}
                          alt={plant.name}
                          fill
                          className="object-cover blur-md"
                          quality={90}
                        />
                        <Image
                          key={`main-${imageUrl}`}
                          src={imageUrl}
                          alt={plant.name}
                          width={600}
                          height={400}
                          className="h-full w-full object-contain absolute top-0 left-0"
                          quality={90}
                          priority
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute top-1/2 left-2" />
                <CarouselNext className="absolute top-1/2 right-2" />
              </Carousel>
            ) : (
              <div className="w-full h-[300px] bg-gray-100 flex items-center justify-center">
                <Leaf className="w-10 h-10 text-gray-400" />
                <span className="text-gray-400 ml-2">No image</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-2xl font-bold items-center justify-center">
                {plant.name}
              </h1>
              {user?.id && <CommentFormDialog plantId={plant.id} />}
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
                <h3 className="text-lg font-semibold text-indigo-500 mb-2">
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
      </div>
    </div>
  );
}
