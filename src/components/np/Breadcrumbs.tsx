import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/JsonLd";

export type Crumb = {
  name: string;
  /** 省略時は現在ページとして扱い、リンクにしない */
  href?: string;
};

/**
 * パンくずリスト。
 * クローラが階層を辿れる実hrefのナビゲーションと、
 * BreadcrumbList 構造化データを一体で出力する。
 */
export default function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="パンくずリスト" className={cn("min-w-0", className)}>
      <JsonLd data={jsonLd} />
      <ol className="flex items-center gap-1 text-sm text-gray-500">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden="true" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="whitespace-nowrap hover:text-gray-700 hover:underline"
              >
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-gray-700">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
