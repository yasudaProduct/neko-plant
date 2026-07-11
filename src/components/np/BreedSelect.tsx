"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NekoSpecies } from "@/types/neko";

/** 猫種の絞り込みセレクト (URLの neko パラメータを切り替える) */
export default function BreedSelect({ value, species }: { value: string; species: NekoSpecies[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (neko: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (neko === "all") {
      params.delete("neko");
    } else {
      params.set("neko", neko);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px] bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">猫種: すべて</SelectItem>
        {species.map((neko) => (
          <SelectItem key={neko.id} value={neko.id.toString()}>
            {neko.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
