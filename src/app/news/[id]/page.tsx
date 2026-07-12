import { Metadata } from "next";
import { getNewsById } from "@/actions/news-action";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/JsonLd";

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

  const newsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${SITE_URL}/news/${news.id}`,
    mainEntityOfPage: `${SITE_URL}/news/${news.id}`,
    headline: news.title,
    ...(news.create_date ? { datePublished: news.create_date } : {}),
    ...(news.content ? { articleBody: news.content } : {}),
    inLanguage: "ja",
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <JsonLd data={newsJsonLd} />
      <h1 className="text-2xl font-bold mb-8">{news.title}</h1>
      <div className="prose">{news.content}</div>
    </div>
  );
}
