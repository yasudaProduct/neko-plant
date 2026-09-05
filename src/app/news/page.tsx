import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { getNews } from "@/actions/news-action";
import EmptyState from "@/components/np/EmptyState";

export const metadata: Metadata = {
  title: "お知らせ",
  description: "猫と植物からのお知らせ・更新情報の一覧です。",
  alternates: { canonical: "/news" },
};

export default async function NewsListPage() {
  const news = await getNews();

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-12 flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">お知らせ</h1>

      {news.length > 0 ? (
        <div className="flex flex-col gap-4">
          {news.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">{item.title}</h2>
                <time className="shrink-0 text-xs text-gray-500">
                  {format(new Date(item.create_date), "yyyy年MM月dd日", {
                    locale: ja,
                  })}
                </time>
              </div>
              <p className="text-sm text-gray-700 leading-normal whitespace-pre-wrap">
                {item.content}
              </p>
              {item.tag && (
                // サイト内のページなので別タブでは開かない
                <Link
                  href={`/news/${item.id}`}
                  className="self-start inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:underline"
                >
                  詳細を見る
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text="お知らせはありません" />
      )}
    </div>
  );
}
