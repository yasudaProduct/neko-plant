import { Suspense, cache } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RatingBar from "@/components/RatingBar";
import { getPlant, getPlantImages } from "@/actions/plant-action";
import { getEvaluations } from "@/actions/evaluation-action";
import { Evaluation, EvaluationType } from "@/types/evaluation";
import { Plant } from "@/types/plant";
import { notFound } from "next/navigation";
import { Leaf, Pencil } from "lucide-react";
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
import PlantImageUploadDialog from "./PlantImageUploadDialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// リクエスト単位で getEvaluations をキャッシュし、PlantRating と EvaluationsGrid で重複呼び出しを防止
const getCachedEvaluations = cache(getEvaluations);

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

  // 植物画像を取得
  const plantImages: string[] | undefined = await getPlantImages(plant.id);

  return (
    <div className="container mx-auto w-full 2xl:w-3/5">
      <div className="p-4">
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
            <div className="flex flex-col md:flex-row">
              {plantImages && Array.isArray(plantImages) ? (
                <div className="w-full md:w-1/2 h-[300px] relative">
                  <Carousel>
                    <CarouselContent>
                      {plantImages.map((imageUrl) => (
                        <CarouselItem key={imageUrl} className="w-full">
                          <div className="h-[300px] relative">
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
                              fill
                              className="h-full w-full md:w-1/2 object-contain absolute top-0 left-0"
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
                </div>
              ) : (
                <div className="w-full md:w-1/2 h-[300px] bg-gray-100 flex items-center justify-center">
                  <Leaf className="w-10 h-10 text-gray-400" />
                  <span className="text-gray-400 ml-2">No image</span>
                </div>
              )}
              <div className="w-full md:w-1/2 flex flex-col gap-2 p-4">
                <div className="text-2xl font-bold">
                  <span data-testid="plant-name">{plant.name}</span>
                  <span className="text-sm text-gray-500 ml-4">
                    学名：
                    {plant.scientific_name
                      ? ` ${plant.scientific_name}`
                      : "未設定"}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="text-sm text-gray-500 ml-4">
                    科：
                    {plant.genus ? ` ${plant.genus}` : "未設定"}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="text-sm text-gray-500 ml-4">
                    属：
                    {plant.species ? ` ${plant.species}` : "未設定"}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="text-sm text-gray-500 ml-4">
                    種：
                    {plant.species ? ` ${plant.species}` : "未設定"}
                  </span>
                </div>

                <Suspense
                  fallback={
                    <div className="flex flex-col gap-2 mt-8">
                      <span className="text-sm text-gray-500">評価</span>
                      <Skeleton className="h-4 w-full rounded-full" />
                    </div>
                  }
                >
                  <PlantRating plantId={plant.id} />
                </Suspense>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {user?.id && (
                <>
                  <div className="flex gap-2">
                    <CommentFormDialog plantId={plant.id} />
                    <PlantImageUploadDialog plantId={plant.id} />
                    <Link href={`/plants/${plant.id}/edit`}>
                      <Button variant="outline">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                <FavoriteButton
                  plantId={plant.id}
                  isFavorite={plant.isFavorite}
                />
                <HaveButton plantId={plant.id} isHave={plant.isHave} />
              </div>
            </div>

            {/* Comments Grid */}
            <Suspense fallback={<EvaluationsSkeleton />}>
              <EvaluationsGrid plantId={plant.id} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function PlantRating({ plantId }: { plantId: number }) {
  const evaluations = await getCachedEvaluations(plantId);
  let goodCount = 0;
  let badCount = 0;
  for (const e of evaluations) {
    if (e.type === EvaluationType.GOOD) goodCount++;
    else if (e.type === EvaluationType.BAD) badCount++;
  }
  return (
    <div className="flex flex-col gap-2 mt-8">
      <span className="text-sm text-gray-500">評価</span>
      <RatingBar likes={goodCount} dislikes={badCount} />
    </div>
  );
}

async function EvaluationsGrid({ plantId }: { plantId: number }) {
  const evaluations = await getCachedEvaluations(plantId);
  const goodEvaluations: Evaluation[] = [];
  const badEvaluations: Evaluation[] = [];
  for (const evaluation of evaluations) {
    if (evaluation.type === EvaluationType.GOOD)
      goodEvaluations.push(evaluation);
    else if (evaluation.type === EvaluationType.BAD)
      badEvaluations.push(evaluation);
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-lg font-semibold text-green-600 mb-2">
          良い評価 {"(" + goodEvaluations.length + ")"}
        </h3>
        <div className="space-y-4 max-h-[300px] md:max-h-[500px] overflow-y-auto">
          {goodEvaluations
            .filter((evaluation) => evaluation.comment)
            .map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-indigo-500 mb-2">
          悪い評価 {"(" + badEvaluations.length + ")"}
        </h3>
        <div className="space-y-4 max-h-[300px] md:max-h-[500px] overflow-y-auto">
          {badEvaluations
            .filter((evaluation) => evaluation.comment)
            .map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))}
        </div>
      </div>
    </div>
  );
}

function EvaluationsSkeleton() {
  return (
    <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
