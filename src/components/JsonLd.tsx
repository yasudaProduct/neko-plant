import { headers } from "next/headers";

type Props = {
  data: Record<string, unknown>;
};

/**
 * JSON-LD構造化データを安全に埋め込む共通コンポーネント。
 *
 * JSON.stringify は "<" ">" "&" をエスケープしないため、UGC
 * (投稿コメント・ユーザー名・Notion本文など) に "</script>" が
 * 含まれるとスクリプトからブレイクアウトできてしまう (XSS)。
 * ここでユニコードエスケープに置換してから埋め込む。
 * (JSON文字列としての意味は変わらない)
 */
export default async function JsonLd({ data }: Props) {
  // 本番はCSPが nonce ベースのため、middleware が発行した nonce を付与する
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
