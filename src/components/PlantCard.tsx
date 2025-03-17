import { Heart, Leaf, Skull } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import Image from "next/image";

export interface PlantCardProps {
  name: string;
  imageSrc?: string;
  isSafe: boolean;
  likes: number;
  dislikes: number;
  reviewCount: number;
}

export default function PlantCard({
  name,
  imageSrc,
  likes,
  dislikes,
  reviewCount,
}: PlantCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 w-full">
        {imageSrc ? (
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
            <span className="text-gray-400 ml-2">No image</span>
          </div>
        )}
      </div>
      <CardHeader className="relative pb-0">
        {/* <Badge
          className={`absolute top-4 right-4 ${
            isSafe
              ? "bg-success text-success-foreground"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {isSafe ? "安全" : "危険"}
        </Badge> */}
      </CardHeader>
      <CardContent className="pt-4">
        <CardTitle className="text-xl mb-2">{name}</CardTitle>
        <CardDescription className="flex items-center justify-between text-sm">
          {/* <div className="flex gap-4"> */}
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-red-600" />
            {likes}
          </span>
          <span className="flex items-center gap-1">
            <Skull className="h-4 w-4 text-indigo-600" />
            {dislikes}
          </span>
          {/* </div> */}
          <span>レビュー {reviewCount}件</span>
        </CardDescription>
      </CardContent>
    </Card>
  );
}
