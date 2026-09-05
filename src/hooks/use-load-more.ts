"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * 一覧の追記読み込み。
 * 初期ページはサーバーコンポーネントが取得済みで、2ページ目以降をここで足していく。
 */
export function useLoadMore<T extends { id: number }>(
    initialItems: T[],
    fetchPage: (page: number) => Promise<T[]>,
) {
    const { error } = useToast();
    const [items, setItems] = useState(initialItems);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const loadMore = async () => {
        setIsLoading(true);
        try {
            const next = page + 1;
            const fetched = await fetchPage(next);

            // 読み込みの間に新しい行が増えると offset がずれるため、id で重複を落とす
            setItems((prev) => {
                const seen = new Set(prev.map((item) => item.id));
                return [...prev, ...fetched.filter((item) => !seen.has(item.id))];
            });
            setPage(next);
        } catch {
            error({
                title: "読み込みに失敗しました",
                description: "通信環境をご確認のうえ、もう一度お試しください。",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return { items, isLoading, loadMore };
}
