import Link from "next/link";
import { Button } from "./ui/button";
import { Leaf } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-[#2d5a27] text-primary-foreground p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-medium">
          <Leaf className="w-6 h-6" />
          ネコと植物の相性チェッカー
        </Link>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          ログイン
        </Button>
      </div>
    </header>
  );
}
