import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { UsersRepository } from './users.repository';

@Module({
  imports: [PrismaModule],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersRepositoryModule {}
