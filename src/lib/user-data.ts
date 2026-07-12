import prisma from "@/lib/prisma";
import { UserData, UserRole } from "@/types/user";

/**
 * auth_id からユーザー情報 (role含む) を取得するサーバー専用ヘルパー。
 * role を含むため Server Action としては公開しない ("use server" ファイルに置くと
 * クライアントから任意の authId で直接呼び出せる無認証エンドポイントになる)。
 */
export async function getUserData(authId: string): Promise<UserData | null> {
    const userData = await prisma.public_users.findFirst({
        where: {
            auth_id: authId,
        },
    });

    if (!userData) {
        return null;
    }

    return {
        id: userData.id,
        aliasId: userData.alias_id,
        authId: userData.auth_id,
        name: userData.name,
        image: userData.image,
        role: (userData.role || 'user') as UserRole,
    };
}
