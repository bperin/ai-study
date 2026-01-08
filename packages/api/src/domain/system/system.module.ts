import { Module } from '@nestjs/common';
import { HealthController } from '../../http/controllers/health.controller';
import { SystemService } from './system.service';
import { SwaggerService } from '../../http/swagger.service';

@Module({
  controllers: [HealthController],
  providers: [SystemService, SwaggerService],
  exports: [SystemService, SwaggerService],
})
export class SystemModule {}
