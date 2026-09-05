import { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "猫と植物へのお問い合わせフォームです。ご意見・ご要望をお寄せください。",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-12 flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">お問い合わせ</h1>
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <iframe
          src="https://confirmed-giant-27d.notion.site/ebd/1c69f17f06688007995fc3497043f841"
          title="お問い合わせフォーム"
          width="100%"
          height="1280"
          allowFullScreen
        />
        {/* 埋め込みがブロックされる環境 (広告ブロッカー等) 向けの逃げ道 */}
        <p className="mt-4 text-sm text-gray-500 text-center">
          フォームが表示されない場合は{" "}
          <a
            href="https://confirmed-giant-27d.notion.site/1c69f17f06688007995fc3497043f841"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 font-medium hover:underline"
          >
            こちら
          </a>
          {" "}からお問い合わせください。
        </p>
      </div>
    </div>
  );
}
