import { Body, Controller, Post, Get, UseGuards, Request, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestsService } from './tests.service';
import { LeaderboardService } from './leaderboard.service';
import { TestHistoryResponseDto, TestHistoryItemDto, SubmitTestResultsDto } from './dto/test-results.dto';
import { TestStatsDto } from './dto/test-stats.dto';
import { ChatAssistanceDto, ChatAssistanceResponseDto } from './dto/chat-assistance.dto';
import { StartAttemptResponseDto } from './dto/start-attempt-response.dto';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestsController {
  constructor(
    private testsService: TestsService,
    private leaderboardService: LeaderboardService,
  ) {}

  @Post('submit')
  submitTest(@Request() req: any, @Body() dto: SubmitTestDto) {
    return this.testsService.submitTest(req.user.userId, dto);
  }

  @Get('leaderboard')
  async getGlobalLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.leaderboardService.getGlobalLeaderboard(limitNum);
  }

  @Get('leaderboard/me')
  async getMyRank(@Request() req: any) {
    return this.leaderboardService.getUserRank(req.user.userId);
  }

  @Get('leaderboard/:documentId')
  @ApiOperation({ summary: 'Get leaderboard for a specific document' })
  async getLeaderboard(@Param('documentId') documentId: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardService.getLeaderboard(documentId, limitNum);
  }

  @Get('history')
  @ApiOperation({ summary: "Get user's test history with scores and reports" })
  @ApiResponse({ status: 200, type: TestHistoryResponseDto })
  async getTestHistory(@Request() req: any): Promise<TestHistoryResponseDto> {
    return this.testsService.getTestHistory(req.user.userId);
  }

  @Get('history/all')
  @ApiOperation({ summary: 'Get all users test history' })
  @ApiResponse({ status: 200, type: TestHistoryResponseDto })
  async getAllTestHistory(): Promise<TestHistoryResponseDto> {
    return this.testsService.getAllTestHistory();
  }

  @Get('stats/:documentId')
  @ApiOperation({ summary: 'Get test stats: attempt count, avg score, top scorer' })
  @ApiResponse({ status: 200, type: TestStatsDto })
  async getTestStats(@Param('documentId') documentId: string): Promise<TestStatsDto> {
    return this.testsService.getTestStats(documentId);
  }

  @Get('attempt/:id')
  @ApiOperation({ summary: 'Get detailed results for a specific test attempt' })
  @ApiResponse({ status: 200, type: TestHistoryItemDto })
  async getAttemptDetails(@Request() req: any, @Param('id') id: string): Promise<TestHistoryItemDto> {
    return this.testsService.getAttemptDetails(req.user.userId, id);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI for help on a question' })
  @ApiResponse({ status: 200, description: 'AI assistance response' })
  async chatAssist(@Body() body: { message: string; questionId: string; history?: any[] }) {
    return this.testsService.chatAssist(body.message, body.questionId, body.history);
  }

  // === Test Attempt Management (consolidated from TestAttemptsController) ===

  @Post('attempts/:evalId/start')
  @ApiOperation({ summary: 'Start a new test attempt' })
  @ApiResponse({ status: 201, description: 'Test attempt started successfully', type: StartAttemptResponseDto })
  async startAttempt(@Request() req: any, @Param('evalId') evalId: string): Promise<StartAttemptResponseDto> {
    return this.testsService.startAttempt(evalId, req.user.userId);
  }

  @Post('attempts/complete')
  @ApiOperation({ summary: 'Complete test' })
  @ApiResponse({ status: 200, description: 'Test results submitted successfully' })
  async submitTestResults(@Body() body: SubmitTestResultsDto): Promise<{ attemptId: string; score: number; percentage: number }> {
    return this.testsService.submitTestResults(body);
  }
}
