"use client";

import PlantCard from "@/components/PlantCard";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Plant = {
  id: number;
  name: string;
  image: string;
};

export default function Home() {
  const supabase = createClient();
  const [plants, setPlants] = useState<Plant[]>([]);

  useEffect(() => {
    console.log("fetching plants");
    const fetchPlants = async () => {
      const { data, error } = await supabase
        .from("plants")
        .select("id, name, image");

      if (error) {
        console.error("Error fetching plants:", error);
      } else {
        console.log("data", data);
        setPlants(data);
      }
    };
    fetchPlants();
  }, []);

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

        {plants.length === 0 ? (
          <p className="text-center text-muted-foreground">
            植物が見つかりませんでした
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {plants.map((plant) => (
              <Link href={`/plants/${plant.id}`} key={plant.id}>
                <PlantCard
                  key={plant.id}
                  name={plant.name}
                  imageSrc={""}
                  isSafe={true}
                  likes={0}
                  dislikes={0}
                  reviewCount={0}
                />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
