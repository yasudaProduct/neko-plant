import PlantSearch from "@/components/PlantSearch";
import { Suspense } from "react";

export default function Plants() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Suspense
          fallback={<div className="text-center mt-8">読み込み中...</div>}
        >
          <PlantSearch />
        </Suspense>
      </div>
    </div>
  );
}
