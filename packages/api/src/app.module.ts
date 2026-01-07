import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './shared/logging/winston.config';
import { BullModule } from '@nestjs/bullmq';
import { SharedModule } from './shared/shared.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PdfStatusModule } from './pdf-status.module';
import { UsersModule } from './domain/users/users.module';
import { AuthModule } from './domain/auth/auth.module';
import { TestsModule } from './domain/study-tests/tests.module';
import { UploadsModule } from './domain/uploads/uploads.module';
import { DocumentsModule } from './domain/documents/documents.module';
import { GenAiModule } from './infrastructure/genai/genai.module';
import { QueueModule } from './domain/queue/queue.module';
import { SystemModule } from './domain/system/system.module';
import configuration from './config/configuration';
import { validate } from './config/validate';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    WinstonModule.forRoot(winstonConfig),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          maxRetriesPerRequest: null,
          tls: configService.get<string>('redis.host') && configService.get<string>('redis.host') !== 'localhost' ? {} : undefined,
        },
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    PrismaModule,
    PdfStatusModule,
    UsersModule,
    AuthModule,
    TestsModule,
    UploadsModule,
    DocumentsModule,
    GenAiModule,
    QueueModule,
    SystemModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
