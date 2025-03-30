import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-6 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex justify-center gap-4 mb-4">
          <Link href="/contact">お問い合わせ</Link>
        </div>
        <p className="text-sm text-primary-foreground/60">
          © 2025 猫と植物 neko and plants
        </p>
      </div>
    </footer>
  );
}
