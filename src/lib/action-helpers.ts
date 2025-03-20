"use server";

import { createClient } from "./supabase/server";

export class AuthRequiredError extends Error {
    constructor(message: string = "認証が必要です") {
        super(message);
        this.name = "AuthRequiredError";
    }
}

/**
 * サーバーアクションが認証を必要とするかどうかをチェック
 */
export async function requireAuth() {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        throw new AuthRequiredError();
    }

    return session;
}

/**
 * サーバーアクションに認証チェックを追加
 * @param actionFn 実行するサーバーアクション関数
 * @returns サーバーアクション関数
 */
export function withAuth<Args extends unknown[], Return>(
    actionFn: (...args: Args) => Promise<Return>
) {
    return async (...args: Args): Promise<Return> => {
        await requireAuth();
        return actionFn(...args);
    };
}