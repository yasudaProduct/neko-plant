"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveImage, rejectImage } from "../actions";

interface PlantImageApprovalProps {
  image: {
    id: number;
    imageUrl: string;
    caption: string | null;
    altText: string | null;
    createdAt: Date;
    plant: {
      id: number;
      name: string;
    };
    user: {
      id: number;
      name: string;
      aliasId: string;
    };
  };
}

export default function PlantImageApproval({ image }: PlantImageApprovalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await approveImage(image.id);
      setIsApproved(true);
    } catch (error) {
      console.error("Failed to approve image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await rejectImage(image.id);
      setIsApproved(false);
    } catch (error) {
      console.error("Failed to reject image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isApproved === true) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="text-center">
            <Badge variant="default" className="bg-green-600">
              承認済み
            </Badge>
            <p className="text-sm text-green-700 mt-2">画像が承認されました</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isApproved === false) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="text-center">
            <Badge variant="destructive">
              拒否済み
            </Badge>
            <p className="text-sm text-red-700 mt-2">画像が拒否されました</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{image.plant.name}</CardTitle>
        <div className="text-sm text-gray-500">
          投稿者: {image.user.name} (@{image.user.aliasId})
        </div>
        <div className="text-xs text-gray-400">
          {new Date(image.createdAt).toLocaleDateString("ja-JP")}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-square mb-4">
          <Image
            src={image.imageUrl}
            alt={image.altText || `${image.plant.name}の画像`}
            fill
            className="object-cover rounded-lg"
          />
        </div>
        
        {image.caption && (
          <p className="text-sm text-gray-600 mb-4">{image.caption}</p>
        )}

        <div className="flex space-x-2">
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1"
            variant="default"
          >
            {isLoading ? "処理中..." : "承認"}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1"
            variant="destructive"
          >
            {isLoading ? "処理中..." : "拒否"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}