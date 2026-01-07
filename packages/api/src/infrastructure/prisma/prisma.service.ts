import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    super(
      (() => {
        const url = configService.get<string>('database.url');
        console.log(`PrismaService: DATABASE_URL=${url ? 'Set' : 'Not Set'}`);
        if (!url) {
          console.error('PrismaService: DATABASE_URL is not set. This will likely cause a crash.');
        }
        const isAccelerate = url && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'));

        const logLevels: any[] = configService.get('environment') === 'production' ? ['info', 'warn', 'error'] : ['query', 'info', 'warn', 'error'];

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
      })() as any,
    );
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Database connection established.');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
  }
}
