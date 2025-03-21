"use client";

import { useAuthDialog } from "@/contexts/AuthDialogContext";
import { useState, useCallback } from "react";
import { toast } from "./use-toast";
import { ActionErrorCode, ActionResult } from "@/types/common";

/**
 * 認証が必要なサーバーアクションを実行するためのカスタムフック
 * 認証エラーが発生した場合、自動的にログインダイアログを表示する
 */
export function useAction<T extends unknown[], R>(
    actionFn: (...args: T) => Promise<ActionResult<R>>
) {
    const { showLoginDialog } = useAuthDialog();
    const [error, setError] = useState<Error | null>(null);

    const execute = useCallback(
        async (...args: T): Promise<ActionResult<R> | undefined> => {
            setError(null);

            try {
                const result = await actionFn(...args);
                if (result.success) {
                    toast({
                        title: result.title,
                        description: result.message,
                        variant: "success",
                    });
                } else {
                    if (result.code === ActionErrorCode.AUTH_REQUIRED) {
                        showLoginDialog(result.message);
                    } else {
                        toast({
                            title: "エラーが発生しました",
                            description: result.message,
                            variant: "error",
                        });
                    }
                }
                return result;
            } catch (err) {
                setError(err as Error);
                if (err instanceof Error) {
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
            }
        },
        [actionFn, showLoginDialog]
    );

    return {
        execute,
        error,
    };
}