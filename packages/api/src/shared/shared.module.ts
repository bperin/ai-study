import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [],
  exports: [PrismaModule],
})
export class SharedModule {}
