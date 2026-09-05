import { Metadata } from "next";
import { MAX_PLANT_NAME_LENGTH } from "@/lib/const";
import PlantNewForm from "./PlantNewForm";

export const metadata: Metadata = {
  title: "植物を登録",
  description: "共存図鑑に新しい植物を登録します。",
  // 認証が必要な操作ページなので検索結果には載せない (robots.ts でも除外)
  robots: { index: false },
};

export default async function NewPlantPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const params = await searchParams;

  return <PlantNewForm defaultName={(params.name ?? "").slice(0, MAX_PLANT_NAME_LENGTH)} />;
}
