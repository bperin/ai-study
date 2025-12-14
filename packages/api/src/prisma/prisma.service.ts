import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super(
            ((process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith("prisma://") || process.env.DATABASE_URL.startsWith("prisma+postgres://")))
                ? {
                      accelerateUrl: process.env.DATABASE_URL,
                      log: ["query", "info", "warn", "error"],
                  }
                : {
                      datasources: {
                          db: {
                              url: process.env.DATABASE_URL,
                          },
                      },
                      log: ["query", "info", "warn", "error"],
                  }) as any
        );
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
