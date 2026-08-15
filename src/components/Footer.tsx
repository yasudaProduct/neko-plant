import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-6 px-4">
      <div className="max-w-6xl mx-auto text-center">
        {/* 語中で折り返さず、項目単位で折り返す */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          <Link href="/contact" className="whitespace-nowrap">お問い合わせ</Link>
          <Link href="/news" className="whitespace-nowrap">お知らせ</Link>
          <Link href="/terms" className="whitespace-nowrap">利用規約</Link>
          <Link href="/privacy" className="whitespace-nowrap">プライバシーポリシー</Link>
        </div>
        <p className="text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} 猫と植物 neko and plants
        </p>
      </div>
    </footer>
  );
}
