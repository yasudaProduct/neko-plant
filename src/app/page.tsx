"use client";

import PlantSearch from "@/components/PlantSearch";

// 検索パラメータを使用するコンポーネント
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
        <PlantSearch />
      </main>
    </div>
  );
}
