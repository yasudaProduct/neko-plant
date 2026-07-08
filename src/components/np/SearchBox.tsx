"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** 植物検索ボックス (URLの q パラメータを更新する) */
export default function SearchBox({ initialQuery, placeholder }: { initialQuery: string; placeholder?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2 max-w-xl mx-auto">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "植物名で検索（例: モンステラ）"}
        className="bg-white h-10"
        data-testid="search-input"
      />
      <Button type="submit" className="bg-green-500 hover:bg-green-600 h-10 shrink-0" data-testid="search-button">
        <Search className="w-4 h-4" />
        検索
      </Button>
    </form>
  );
}
