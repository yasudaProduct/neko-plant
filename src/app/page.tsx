"use client";

import PlantSearch from "@/components/PlantSearch";
import { Suspense } from "react";
import Image from "next/image";

// 検索パラメータを使用するコンポーネント
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12 px-4 bg-gradient-to-b from-background to-secondary/30">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <Image
            src="/images/logo.png"
            alt="logo"
            width={100}
            height={100}
            className="mb-4 rounded-md"
          />
          <p className="text-4xl font-bold text-primary mb-4">
            植物は猫に安全？
          </p>
          <p className="text-muted-foreground mb-8">
            猫と暮らす飼い主さんの実体験をもとに、植物の安全性を確認できます
          </p>
        </div>
        <Suspense
          fallback={<div className="text-center mt-8">読み込み中...</div>}
        >
          <PlantSearch />
        </Suspense>
      </main>
    </div>
  );
}
