import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
    log: // https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging
        [
            // {
            //     emit: 'stdout',
            //     level: 'query',
            // },
            {
                emit: 'stdout',
                level: 'info',
            },
            {
                emit: 'stdout',
                level: 'warn',
            },
            {
                emit: 'stdout',
                level: 'error',
            },
        ],
    // auth.users のパスワードハッシュ・各種トークンは全クエリで既定除外する。
    // 将来 "use server" から auth_users を返しても、アカウント乗っ取りに直結する
    // これらの値が誤ってクライアントへ漏れないようにするための多層防御。
    omit: {
        auth_users: {
            encrypted_password: true,
            confirmation_token: true,
            recovery_token: true,
            email_change_token_new: true,
            email_change_token_current: true,
            phone_change_token: true,
            reauthentication_token: true,
        }
    }
});

// prisma.$on("query", (e: Prisma.QueryEvent) => {
//     console.log("Query: " + e.query);
//     console.log("Params: " + e.params);
//     console.log("Duration: " + e.duration + "ms");
//     console.log("Target: " + e.target);
// });

export default prisma;