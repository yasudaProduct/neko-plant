"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** 戻るリンク */
export default function BackLink({ label = "戻る" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 py-1 text-sm text-gray-500 hover:text-gray-700"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
