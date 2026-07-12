import { Metadata } from "next";
import { getNewsById } from "@/actions/news-action";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const news = await getNewsById(id);

  const excerpt = news.content.replace(/\s+/g, " ").trim().slice(0, 120);

  return {
    title: news.title,
    description: excerpt || `猫と植物からのお知らせ「${news.title}」です。`,
    alternates: { canonical: `/news/${news.id}` },
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const news = await getNewsById(id);
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{news.title}</h1>
      <div className="prose">{news.content}</div>
    </div>
  );
}
