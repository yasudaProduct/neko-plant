import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookHeart, ChevronRight, Pencil, PawPrint, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlant, getPlants } from "@/actions/plant-action";
import { getPostsByPlant } from "@/actions/post-action";
import { getUserData } from "@/lib/user-data";
import { getCoexistenceMessage, getCoexistenceRank } from "@/lib/coexistence";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs from "@/components/np/Breadcrumbs";
import CoexistBadge from "@/components/np/CoexistBadge";
import CoexistBar from "@/components/np/CoexistBar";
import CatChip from "@/components/np/CatChip";
import PostTile from "@/components/np/PostTile";
import EmptyState from "@/components/np/EmptyState";
import PhotoPlaceholder from "@/components/np/PhotoPlaceholder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plant = await getPlant(Number(id));

  if (!plant) {
    return { title: "植物が見つかりません", robots: { index: false } };
  }

  return {
    title: plant.name,
    description: `${plant.name}の猫との共存実績: ${getCoexistenceMessage(plant.catCount)}。みんなの投稿から集計しています。`,
    alternates: { canonical: `/plants/${plant.id}` },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ja_JP",
      url: `/plants/${plant.id}`,
      images: plant.mainImageUrl
        ? [{ url: plant.mainImageUrl, alt: plant.name }]
        : [{ url: "/images/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
  };
}

export default async function PlantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plantId = Number(id);

  if (Number.isNaN(plantId)) {
    return notFound();
  }

  const supabase = await createClient();

  const [plant, { posts, totalCount }, topPlants, { data: { user } }] = await Promise.all([
    getPlant(plantId),
    getPostsByPlant(plantId, 1, 12),
    getPlants("cats", 1, 5),
    supabase.auth.getUser(),
  ]);

  if (!plant) {
    return notFound();
  }

  // 植物カタログの編集導線は管理者のみに表示 (認可はサーバーアクション側でも実施)
  const isAdmin = user != null && (await getUserData(user.id))?.role === "admin";

  const rank = getCoexistenceRank(plant.catCount);

  // 一緒に暮らしている猫 (取得済み投稿から)
  const relatedCats = [
    ...new Map(posts.flatMap((post) => post.pets).map((pet) => [pet.id, pet])).values(),
  ];

  // 共存実績の分布 (上位5件 + 自分)
  const distributionRows = topPlants.plants.some((p) => p.id === plant.id)
    ? topPlants.plants
    : [...topPlants.plants.slice(0, 4), plant];
  const maxCats = Math.max(...distributionRows.map((p) => p.catCount), 1);

  // 植物の構造化データ。「安全/危険」の断定 (AggregateRating等) は
  // ポジティブリスト方針に反するため使わず、実績数を中立に記述する
  const plantJsonLd = {
    "@context": "https://schema.org",
    "@type": "Thing",
    "@id": `${SITE_URL}/plants/${plant.id}`,
    url: `${SITE_URL}/plants/${plant.id}`,
    name: plant.name,
    ...(plant.scientific_name ? { alternateName: plant.scientific_name } : {}),
    ...(plant.mainImageUrl ? { image: plant.mainImageUrl } : {}),
    description: `${plant.name}の猫との共存実績: ${getCoexistenceMessage(plant.catCount)}。みんなの投稿から集計しています。`,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "共存実績のあるユニークな猫の数",
        value: plant.catCount,
        unitText: "匹",
      },
      {
        "@type": "PropertyValue",
        name: "観測された投稿数",
        value: plant.postCount,
        unitText: "件",
      },
    ],
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
      <JsonLd data={plantJsonLd} />
      <div className="flex items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { name: "ホーム", href: "/" },
            { name: "共存図鑑", href: "/zukan" },
            { name: plant.name },
          ]}
        />
        {isAdmin && (
          <Link
            href={`/plants/${plant.id}/edit`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <Pencil className="w-3.5 h-3.5" />
            編集
          </Link>
        )}
      </div>

      {/* ヘッダーカード */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex max-sm:flex-col">
          <div className="relative w-60 shrink-0 min-h-[220px] max-sm:w-full max-sm:aspect-video max-sm:min-h-0 bg-gray-100">
            {plant.mainImageUrl ? (
              <Image
                src={plant.mainImageUrl}
                alt={plant.name}
                fill
                sizes="(max-width: 640px) 100vw, 240px"
                className="object-cover"
                priority
              />
            ) : (
              <PhotoPlaceholder className="absolute inset-0" />
            )}
          </div>
          <div className="p-6 flex flex-col gap-2.5 min-w-0 flex-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1" data-testid="plant-name">
                {plant.name}
              </h1>
              {(plant.scientific_name || plant.family) && (
                <p className="text-sm text-gray-400">
                  {plant.scientific_name && <span className="italic">{plant.scientific_name}</span>}
                  {plant.scientific_name && plant.family && <span className="mx-1.5">·</span>}
                  {plant.family}
                </p>
              )}
            </div>
            <div className="mt-auto pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                {rank === "none" ? (
                  <TriangleAlert className="w-7 h-7 text-orange-700 shrink-0" />
                ) : (
                  <PawPrint className="w-7 h-7 text-green-600 shrink-0" />
                )}
                <span
                  className={`text-xl font-bold ${rank === "none" ? "text-orange-700" : "text-green-700"}`}
                  data-testid="coexist-label"
                >
                  {getCoexistenceMessage(plant.catCount)}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {plant.postCount > 0
                  ? `${plant.postCount}件の投稿・${plant.catCount}匹のユニークな猫から集計しています`
                  : "この植物にはまだ投稿がありません"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 情報なしの注意喚起 (断定しない表現) */}
      {rank === "none" && (
        <div className="flex gap-2.5 p-4 rounded-lg bg-orange-100 border border-orange-200 text-orange-700">
          <TriangleAlert className="w-[18px] h-[18px] shrink-0 mt-0.5" />
          <p className="text-sm leading-normal">
            猫との共存について、コミュニティからの情報がまだありません。お迎えや置き場所を検討する際は、慎重にご判断ください。
          </p>
        </div>
      )}

      {/* カタログ情報 */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-900">カタログ情報</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-gray-500">学名</dt>
          <dd className="text-gray-800 italic">{plant.scientific_name ?? "—"}</dd>
          <dt className="text-gray-500">科名</dt>
          <dd className="text-gray-800">{plant.family ?? "—"}</dd>
          <dt className="text-gray-500">観測された投稿</dt>
          <dd className="text-gray-800">{plant.postCount} 件</dd>
          <dt className="text-gray-500">ユニークな猫</dt>
          <dd className="text-gray-800">
            {plant.catCount} 匹
            <span className="ml-2 text-xs text-gray-400">同一ユーザーの重複投稿では水増しされません</span>
          </dd>
          <dt className="text-gray-500">外部データ照合</dt>
          <dd className="text-gray-800">—（今後対応予定）</dd>
          <dt className="text-gray-500">共存実績</dt>
          <dd>
            <CoexistBadge catCount={plant.catCount} />
          </dd>
        </dl>
      </div>

      {/* 共存実績の分布 */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-3.5">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-semibold text-gray-900">共存実績の分布</h2>
          <span className="text-xs text-gray-400">実績の多い植物とのくらべ</span>
        </div>
        <div className="flex flex-col gap-2">
          {distributionRows.map((row) => {
            const isSelf = row.id === plant.id;
            return (
              <div key={row.id} className="flex items-center gap-3">
                <span
                  className={`w-32 shrink-0 text-sm truncate ${
                    isSelf ? "font-bold text-gray-900" : "text-gray-500"
                  }`}
                >
                  {row.name}
                </span>
                <span className="flex-1">
                  <CoexistBar value={row.catCount} max={maxCats} highlight={isSelf} />
                </span>
                <span
                  className={`w-14 shrink-0 text-right text-xs ${
                    isSelf ? "font-bold text-green-700" : "text-gray-500"
                  }`}
                >
                  {row.catCount}匹
                </span>
              </div>
            );
          })}
        </div>
        <Link
          href="/zukan"
          className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
        >
          <BookHeart className="w-4 h-4" />
          共存図鑑ですべて見る
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 一緒に暮らしている猫 */}
      {relatedCats.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-base font-semibold text-gray-900">一緒に暮らしている猫</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {relatedCats.slice(0, 12).map((cat) => (
              <CatChip key={cat.id} name={cat.name} />
            ))}
            {plant.catCount > relatedCats.length && (
              <span className="text-xs text-gray-500">ほか{plant.catCount - relatedCats.length}匹</span>
            )}
          </div>
        </div>
      )}

      {/* みんなの投稿 */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-gray-900">みんなの投稿</h2>
          <span className="text-sm text-gray-500">全{totalCount}件</span>
        </div>
        {posts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {posts.map((post) => (
              <PostTile key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState text="投稿がまだありません" />
        )}
      </div>
    </div>
  );
}
