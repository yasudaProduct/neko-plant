import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import Image from "next/image";

interface PlantCardProps {
  name: string;
  imageSrc: string;
  isSafe: boolean;
  likes: number;
  dislikes: number;
  reviewCount: number;
}

export default function PlantCard({
  name,
  imageSrc,
  isSafe,
  likes,
  dislikes,
  reviewCount,
}: PlantCardProps) {
  return (
    <Card>
      <CardHeader className="relative pb-0">
        <Badge
          className={`absolute top-4 right-4 ${
            isSafe
              ? "bg-success text-success-foreground"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {isSafe ? "安全" : "危険"}
        </Badge>
        <Image
          src={imageSrc}
          alt={name}
          width={384}
          height={256}
          className="object-cover w-full h-64 rounded-t-lg"
        />
      </CardHeader>
      <CardContent className="pt-4">
        <CardTitle className="text-xl mb-2">{name}</CardTitle>
        <CardDescription className="flex items-center justify-between text-sm">
          {/* <div className="flex gap-4"> */}
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-4 w-4 text-green-600" />
            {likes}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="h-4 w-4 text-red-600" />
            {dislikes}
          </span>
          {/* </div> */}
          <span>レビュー {reviewCount}件</span>
        </CardDescription>
      </CardContent>
    </Card>
  );
}
