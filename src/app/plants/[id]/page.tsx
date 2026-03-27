import { Suspense } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlant } from "@/actions/plant-action";
import { getPostsByPlantId } from "@/actions/post-action";
import { Plant } from "@/types/plant";
import { notFound } from "next/navigation";
import { Cat, Leaf, MessageSquare, Pencil } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PlantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const plant: Plant | undefined = await getPlant(Number(id));
  if (!plant) {
    return notFound();
  }
  const { posts } = await getPostsByPlantId(plant.id, 1, 30);

  return (
    <div className="container mx-auto w-full 2xl:w-3/5">
      <div className="p-4">
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
            <div className="flex flex-col md:flex-row">
              {plant.mainImageUrl ? (
                <div className="w-full md:w-1/2 h-[300px] relative">
                  <Image
                    src={plant.mainImageUrl}
                    alt={plant.name}
                    fill
                    className="object-cover"
                  />
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
                    {plant.family ? ` ${plant.family}` : "未設定"}
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
                      <span className="text-sm text-gray-500">共存実績</span>
                      <Skeleton className="h-4 w-full rounded-full" />
                    </div>
                  }
                >
                  <PlantSummary plant={plant} />
                </Suspense>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-end mb-4">
              <Link href={`/plants/${plant.id}/edit`}>
                <Button variant="outline">
                  <Pencil className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <h3 className="text-lg font-semibold mb-3">関連投稿</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  この植物の投稿はまだありません。
                </p>
              ) : (
                posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {post.user.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {post.imageUrls[0] && (
                        <div className="relative h-48 w-full rounded-md overflow-hidden">
                          <Image
                            src={post.imageUrls[0]}
                            alt={plant.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <p className="text-sm">{post.comment ?? "コメントなし"}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlantSummary({ plant }: { plant: Plant }) {
  const cats = plant.coexistenceCatCount;
  const posts = plant.coexistencePostCount;
  return (
    <div className="flex flex-col gap-2 mt-8">
      <span className="text-sm text-gray-500">共存実績</span>
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <Cat className="w-4 h-4 text-green-600" />
          {cats}匹
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4 text-gray-600" />
          {posts}投稿
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {cats === 0
          ? "猫との共存情報がありません。注意してください。"
          : `${cats}匹の猫との共存実績があります。`}
      </p>
    </div>
  );
}
