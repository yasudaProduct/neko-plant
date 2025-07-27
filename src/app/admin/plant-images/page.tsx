import prisma from "@/lib/prisma";
import { STORAGE_PATH } from "@/lib/const";
import PlantImageApproval from "./PlantImageApproval";

export default async function PlantImagesAdmin() {
  const pendingImages = await prisma.plant_images.findMany({
    where: {
      is_approved: false,
    },
    include: {
      plants: true,
      users: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">植物画像管理</h1>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          承認待ちの画像: {pendingImages.length}件
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingImages.map((image) => (
          <PlantImageApproval
            key={image.id}
            image={{
              id: image.id,
              imageUrl: STORAGE_PATH.PLANT + image.image_url,
              caption: image.caption,
              altText: image.alt_text,
              createdAt: image.created_at,
              plant: {
                id: image.plants.id,
                name: image.plants.name,
              },
              user: {
                id: image.users?.id || 0,
                name: image.users?.name || "Unknown User",
                aliasId: image.users?.alias_id || "unknown",
              },
            }}
          />
        ))}
      </div>

      {pendingImages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">承認待ちの画像はありません</p>
        </div>
      )}
    </div>
  );
}