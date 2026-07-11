"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { Post, UserPlantCollectionItem } from "@/types/post";
import { Pet } from "@/types/neko";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostTile from "@/components/np/PostTile";
import CoexistBadge from "@/components/np/CoexistBadge";
import EmptyState from "@/components/np/EmptyState";

type Props = {
  posts: Post[];
  pets: Pet[];
  collection: UserPlantCollectionItem[];
};

const TABS = [
  { value: "posts", label: "投稿" },
  { value: "cats", label: "猫" },
  { value: "plants", label: "植物" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

/** プロフィールのタブ (投稿 / 猫 / 植物コレクション) */
export default function ProfileTabs({ posts, pets, collection }: Props) {
  const [tab, setTab] = useState<TabValue>("posts");

  const counts: Record<TabValue, number> = {
    posts: posts.length,
    cats: pets.length,
    plants: collection.length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            data-testid={`profile-tab-${t.value}`}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === t.value
                ? "text-gray-900 font-semibold border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label} {counts[t.value]}
          </button>
        ))}
      </div>

      {tab === "posts" &&
        (posts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {posts.map((post) => (
              <PostTile key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState icon="image" text="投稿がまだありません" />
        ))}

      {tab === "cats" &&
        (pets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className="bg-white rounded-xl border border-border shadow-sm p-5 flex items-center gap-3.5"
              >
                <Avatar className="w-14 h-14">
                  <AvatarImage src={pet.imageSrc} alt={pet.name} />
                  <AvatarFallback>{pet.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-bold text-gray-900">{pet.name}</span>
                  <span className="text-xs text-gray-500">{pet.neko.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="paw" text="猫が登録されていません" />
        ))}

      {tab === "plants" &&
        (collection.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500">
              投稿から自動的に集計された、一緒に暮らしている植物です。
            </p>
            {collection.map((item) => (
              <Link
                key={item.plantId}
                href={`/plants/${item.plantId}`}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Leaf className="w-[18px] h-[18px] text-green-600 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                  {item.plantName}
                </span>
                <CoexistBadge catCount={item.catCount} compact />
                <span className="text-xs text-gray-500 shrink-0">{item.postCount}件の投稿</span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="植物がまだありません" />
        ))}
    </div>
  );
}
