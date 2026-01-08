import { Module } from '@nestjs/common';
import { ArtifactsRepository } from './artifacts.repository';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsController } from './artifacts.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ArtifactsController],
  providers: [ArtifactsRepository, ArtifactsService],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
