import { getNews } from "@/actions/news-action";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

export default async function NewsListPage() {
  const news = await getNews();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">お知らせ</h1>
      <div className="grid gap-6">
        {news.length > 0 ? (
          news.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  <time className="text-sm text-muted-foreground">
                    {format(new Date(item.create_date), "yyyy年MM月dd日", {
                      locale: ja,
                    })}
                  </time>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{item.content}</p>
                {item.tag && (
                  <Link
                    href={`/news/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    詳細を見る →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p>お知らせはありません</p>
        )}
      </div>
    </div>
  );
}
