"use client";

import PlantCard from "@/components/PlantCard";
import { Input } from "@/components/ui/input";
import { plantData } from "@/lib/mock-data";

export default function Home() {
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

        <div className="grid md:grid-cols-2 gap-6">
          {plantData.map((plant) => (
            <PlantCard
              key={plant.id}
              name={plant.name}
              imageSrc={plant.imageSrc}
              isSafe={plant.isSafe}
              likes={plant.likes}
              dislikes={plant.dislikes}
              reviewCount={plant.reviewCount}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
