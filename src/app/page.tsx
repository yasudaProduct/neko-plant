"use client";

import PlantCard, { PlantCardProps } from "@/components/PlantCard";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plant } from "./types/plant";
import { getPlants } from "@/actions/plant-action";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Evaluation, EvaluationType } from "./types/evaluation";
import { getEvaluations } from "@/actions/evaluation-action";

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantCards, setPlantCards] = useState<PlantCardProps[]>([]);

  useEffect(() => {
    const fetchPlants = async () => {
      const plants = await getPlants();
      setPlants(plants);
    };
    fetchPlants();
  }, []);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (plants.length > 0) {
        const plantCards: PlantCardProps[] = await Promise.all(
          plants.map(async (plant) => {
            const evaluations: Evaluation[] = await getEvaluations(plant.id);
            return {
              name: plant.name,
              imageSrc: plant.imageUrl || undefined,
              isSafe: evaluations.length > 0, // TODO: Safeは必要？
              likes: evaluations.filter(
                (evaluation) => evaluation.type === EvaluationType.GOOD
              ).length,
              dislikes: evaluations.filter(
                (evaluation) => evaluation.type === EvaluationType.BAD
              ).length,
              reviewCount: evaluations.length,
            };
          })
        );

        setPlantCards(plantCards);
      }
    };
    fetchEvaluations();
  }, [plants]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12 px-4 bg-gradient-to-b from-background to-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">
            植物は猫に安全？
          </h1>
          <p className="text-muted-foreground mb-8">
            猫と暮らす飼い主さんの実体験をもとに、植物の安全性を確認できます
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto mb-12">
          <Input
            type="search"
            placeholder="植物名を検索..."
            className="w-full pl-10 py-6 text-lg bg-background border-input"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plants.length === 0 ? (
            <>
              <Card className="w-full h-full">
                <CardContent>
                  <CardHeader>
                    <Skeleton className="w-full h-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="w-[200px] h-[20px] rounded-full" />
                  </CardContent>
                </CardContent>
              </Card>
              <Card className="w-full h-full">
                <CardHeader>
                  <Skeleton className="w-full h-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="w-[200px] h-[20px] rounded-full" />
                </CardContent>
              </Card>
              <Card className="w-full h-full">
                <CardHeader>
                  <Skeleton className="w-full h-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="w-[200px] h-[20px] rounded-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {plants.map((plant) => (
                <Link key={plant.id} href={`/plants/${plant.id}`}>
                  <PlantCard
                    name={plant.name}
                    imageSrc={plant.imageUrl || undefined}
                    isSafe={
                      plantCards.find((card) => card.name === plant.name)
                        ?.isSafe || false
                    }
                    likes={
                      plantCards.find((card) => card.name === plant.name)
                        ?.likes || 0
                    }
                    dislikes={
                      plantCards.find((card) => card.name === plant.name)
                        ?.dislikes || 0
                    }
                    reviewCount={
                      plantCards.find((card) => card.name === plant.name)
                        ?.reviewCount || 0
                    }
                  />
                </Link>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
