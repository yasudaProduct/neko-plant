import { Cat, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Image from "next/image";

export interface PlantCardProps {
  name: string;
  imageSrc?: string;
  coexistenceCatCount: number;
  coexistencePostCount: number;
}

export default function PlantCard({
  name,
  imageSrc,
  coexistenceCatCount,
  coexistencePostCount,
}: PlantCardProps) {
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow"
      data-testid="plant-card"
    >
      <div className="relative w-full h-48 max-md:h-32">
        {imageSrc && imageSrc !== "/images/plant_default.png" ? (
          <div className="relative h-full w-full">
            <Image
              src={imageSrc}
              alt={name}
              fill
              className="object-cover blur-md"
              quality={90}
            />
            <Image
              src={imageSrc}
              alt={name}
              fill
              className="object-contain absolute top-0 left-0"
              quality={90}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Leaf className="w-10 h-10 text-gray-400" />
          </div>
        )}
      </div>
      <CardHeader className="relative pb-0"></CardHeader>
      <CardContent className="pt-4">
        <CardTitle className="text-md mb-2 sm:text-lg md:text-xl">
          {name}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Cat className="h-4 w-4 text-green-600" />
          {coexistenceCatCount > 0 ? (
            <span>{coexistenceCatCount}匹の猫と共存</span>
          ) : coexistencePostCount > 0 ? (
            <span>{coexistencePostCount}件の投稿あり</span>
          ) : (
            <span className="text-amber-600">⚠️ 共存情報なし</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
