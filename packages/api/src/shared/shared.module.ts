import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { AdminGuard } from './admin.guard';
import { UsersModule } from '../domain/users/users.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, UsersModule],
  providers: [AdminGuard],
  exports: [PrismaModule, AdminGuard],
})
export class SharedModule {}