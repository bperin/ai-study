import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RepositoryModule } from '../shared/repositories/repository.module';

@Module({
  controllers: [UsersController],
  imports: [RepositoryModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
