import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [],
  exports: [],
})
export class SharedModule {}
