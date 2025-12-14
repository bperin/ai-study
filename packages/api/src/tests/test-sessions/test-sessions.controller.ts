import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TestSessionsService } from './test-sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { StudySessionSummary } from './interfaces/study-session.interface';

@Controller('test-sessions')
export class TestSessionsController {
  constructor(private readonly testSessionsService: TestSessionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createSession(@Req() request: Request, @Body() dto: StartSessionDto): Promise<StudySessionSummary> {
    const authorization = request.headers['authorization'] || '';
    const token = authorization.replace('Bearer ', '');

    return this.testSessionsService.startSession({
      userId: (request as any).user.userId,
      token,
      payload: dto,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getSession(@Param('id') id: string): StudySessionSummary {
    return this.testSessionsService.getSession(id);
  }
}
