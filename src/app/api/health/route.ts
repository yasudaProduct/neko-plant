import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * 外形監視用のヘルスチェック。
 * 運用手順と監視サービスの設定は doc/04-operations/monitoring.md を参照。
 *
 * 検査するのは「アプリが起動していて、DBに到達できるか」だけ。
 * Auth / Storage / AI / Notion をここで叩くと、相手側の一時的な不調で
 * 本体が正常なのにアラートが鳴るため、あえて含めない。
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 応答が返らないと監視側がタイムアウト扱いになるため、DB待ちに上限を設ける */
const DB_CHECK_TIMEOUT_MS = 5000;

const NO_STORE = {
    // 監視のたびに実際に確認する必要があるのでキャッシュさせない
    "Cache-Control": "no-store, max-age=0",
} as const;

async function checkDatabase(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("database check timed out")), DB_CHECK_TIMEOUT_MS);
        });
        await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
        return true;
    } catch {
        return false;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function GET() {
    const databaseOk = await checkDatabase();

    // 失敗の詳細は返さない (障害の内容は攻撃者への情報になる)。
    // 原因は Vercel のログか reportError の通知で確認する。
    return NextResponse.json(
        {
            status: databaseOk ? "ok" : "error",
            database: databaseOk ? "ok" : "error",
        },
        { status: databaseOk ? 200 : 503, headers: NO_STORE }
    );
}
