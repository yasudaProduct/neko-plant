"use client";

import { useAuthDialog } from "@/contexts/AuthDialogContext";
import { AuthRequiredError } from "@/lib/action-helpers";
import { useState, useCallback } from "react";
import { toast } from "./use-toast";

/**
 * 認証が必要なサーバーアクションを実行するためのカスタムフック
 * 認証エラーが発生した場合、自動的にログインダイアログを表示する
 */
export function useAction<T extends unknown[], R>(
    actionFn: (...args: T) => Promise<R>
) {
    const { showLoginDialog } = useAuthDialog();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const execute = useCallback(
        async (...args: T): Promise<R | undefined> => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await actionFn(...args);
                toast({
                    title: "成功しました",
                    description: "アクションが成功しました",
                    variant: "success",
                });
                return result;
            } catch (err) {
                if (err instanceof AuthRequiredError) {
                    showLoginDialog(err.message);
                } else if (err instanceof Error) {
                    toast({
                        title: "エラーが発生しました",
                        description: err.message,
                        variant: "error",
                    });
                } else {
                    const unknownError = new Error("不明なエラーが発生しました");
                    toast({
                        title: "エラーが発生しました",
                        description: unknownError.message,
                        variant: "error",
                    });
                }
                return undefined;
            } finally {
                setIsLoading(false);
            }
        },
        [actionFn, showLoginDialog]
    );

    return {
        execute,
        isLoading,
        error,
    };
}