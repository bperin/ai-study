import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AdkRunnerService } from './ai/adk-runner.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly adkRunner: AdkRunnerService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/adk')
  async checkAdkHealth() {
    const isAvailable = this.adkRunner?.isAvailable() || false;

    if (!isAvailable) {
      return {
        status: 'unavailable',
        message: 'ADK is not available - using Gemini fallback',
        available: false,
      };
    }

    return {
      status: 'healthy',
      message: 'ADK is operational',
      available: true,
    };
  }
}
