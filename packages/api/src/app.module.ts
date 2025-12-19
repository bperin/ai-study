import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { PdfStatusModule } from './pdf-status.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TestsModule } from './tests/tests.module';
import { UploadsModule } from './uploads/uploads.module';
import { PdfsModule } from './pdfs/pdfs.module';
import { AiModule } from './ai/ai.module';
import { RagModule } from './rag/rag.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        tls: process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost' ? {} : undefined,
      },
    }),
    SharedModule,
    PdfStatusModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    TestsModule,
    UploadsModule,
    PdfsModule,
    AiModule,
    RagModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
