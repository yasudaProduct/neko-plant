import Link from "next/link";
import { cn } from "@/lib/utils";

/** ログイン導線に添える、利用規約・プライバシーポリシーへの同意文言 */
export default function LegalConsentNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-gray-500 text-center leading-normal", className)}>
      ログインすると
      <Link href="/terms" className="text-green-700 hover:underline">
        利用規約
      </Link>
      と
      <Link href="/privacy" className="text-green-700 hover:underline">
        プライバシーポリシー
      </Link>
      に同意したものとみなされます。
    </p>
  );
}
