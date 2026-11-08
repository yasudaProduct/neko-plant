import Link from "next/link";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/contact", label: "お問い合わせ" },
  { href: "/news", label: "お知らせ" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
];

export default function Footer() {
  return (
    // max-sm:pb-24: 下部タブバー (BottomNav) にコピーライトが隠れないための余白
    <footer className="border-t border-border bg-background px-4 py-8 max-sm:pb-24">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center">
        {/* 語中で折り返さず、項目単位で折り返す */}
        <nav aria-label="サイト情報" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm text-ink-secondary transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 text-xs text-ink-muted">
          <p>
            お問い合わせ：
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="whitespace-nowrap transition-colors hover:text-ink hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>
            © {new Date().getFullYear()} {SITE_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
