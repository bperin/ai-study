import { Controller, Get } from '@nestjs/common';
import { SystemService } from '../../domain/system/system.service';

@Controller()
export class HealthController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  getHello(): string {
    return this.systemService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('healthz')
  getHealthz() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
