import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const logger = new Logger(PrismaService.name);
    const url = configService.get<string>('database.url');
    logger.log(`DATABASE_URL=${url ? 'set' : 'not set'}`);
    if (!url) {
      logger.error('DATABASE_URL is not set. Prisma connections will fail.');
    }

    const isAccelerate = url && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'));
    const logLevels: any[] =
      configService.get('environment') === 'production' ? ['info', 'warn', 'error'] : ['query', 'info', 'warn', 'error'];

    const options = isAccelerate
      ? {
          accelerateUrl: url,
          log: logLevels,
        }
      : (() => {
          const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
          const adapter = new PrismaPg(pool);
          return {
            adapter,
            log: logLevels,
          };
        })();

    logger.log(`Adapter=${isAccelerate ? 'accelerate' : 'pg'}, logLevels=${logLevels.join(',')}`);

    super(options as any);
  }

  async onModuleInit() {
    const start = Date.now();
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log(`Database connection established in ${Date.now() - start}ms.`);
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
  }
}
