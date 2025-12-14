import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super(
            (() => {
                const url = process.env.DATABASE_URL;
                const isAccelerate = url && (url.startsWith("prisma://") || url.startsWith("prisma+postgres://"));

                const logLevels: any[] = process.env.NODE_ENV === "production" ? ["info", "warn", "error"] : ["query", "info", "warn", "error"];

                if (isAccelerate) {
                    return {
                        accelerateUrl: url,
                        log: logLevels,
                    };
                } else {
                    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
                    const adapter = new PrismaPg(pool);
                    return {
                        adapter,
                        log: logLevels,
                    };
                }
            })() as any
        );
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
