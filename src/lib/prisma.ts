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
});

// prisma.$on("query", (e: Prisma.QueryEvent) => {
//     console.log("Query: " + e.query);
//     console.log("Params: " + e.params);
//     console.log("Duration: " + e.duration + "ms");
//     console.log("Target: " + e.target);
// });

export default prisma;