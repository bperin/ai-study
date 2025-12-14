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

                if (isAccelerate) {
                    return {
                        accelerateUrl: url,
                        log: ["query", "info", "warn", "error"],
                    };
                } else {
                    const pool = new Pool({ connectionString: url });
                    const adapter = new PrismaPg(pool);
                    return {
                        adapter,
                        log: ["query", "info", "warn", "error"],
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
