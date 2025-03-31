import { getNewsById } from "@/actions/news-action";

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
