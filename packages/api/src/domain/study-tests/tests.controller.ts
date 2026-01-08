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
import { RecordAnswerDto, RecordAnswerResponseDto } from './dto/record-answer.dto';
import { TestSessionStateDto } from './dto/test-session.dto';

@ApiTags('tests')
@Controller('tests')
export class TestsController {
  constructor(
    private testsService: TestsService,
    private leaderboardService: LeaderboardService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('submit')
  submitTest(@Request() req: any, @Body() dto: SubmitTestDto) {
    return this.testsService.submitTest(req.user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  async getGlobalLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.leaderboardService.getGlobalLeaderboard(limitNum);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':documentId/chat-assistance')
  @ApiOperation({ summary: 'Get AI assistance during test taking' })
  @ApiResponse({ status: 200, type: ChatAssistanceResponseDto, description: 'AI assistance response' })
  async getChatAssistance(@Param('documentId') documentId: string, @Body() dto: ChatAssistanceDto, @Request() req: { user: { userId: string } }): Promise<ChatAssistanceResponseDto> {
    return this.testsService.getChatAssistance(dto.message, dto.questionId, documentId, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({ summary: "Get user's test history with scores and reports" })
  @ApiResponse({ status: 200, type: TestHistoryResponseDto })
  async getTestHistory(@Request() req: any): Promise<TestHistoryResponseDto> {
    return this.testsService.getTestHistory(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('history/all')
  @ApiOperation({ summary: 'Get all users test history' })
  @ApiResponse({ status: 200, type: TestHistoryResponseDto })
  async getAllTestHistory(): Promise<TestHistoryResponseDto> {
    return this.testsService.getAllTestHistory();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats/:documentId')
  @ApiOperation({ summary: 'Get test stats: attempt count, avg score, top scorer' })
  @ApiResponse({ status: 200, type: TestStatsDto })
  async getTestStats(@Param('documentId') documentId: string): Promise<TestStatsDto> {
    return this.testsService.getTestStats(documentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('attempt/:id')
  @ApiOperation({ summary: 'Get detailed results for a specific test attempt' })
  @ApiResponse({ status: 200, type: TestHistoryItemDto })
  async getAttemptDetails(@Request() req: any, @Param('id') id: string): Promise<TestHistoryItemDto> {
    return this.testsService.getAttemptDetails(req.user.userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI for help on a question' })
  @ApiResponse({ status: 200, description: 'AI assistance response' })
  async chatAssist(@Body() body: { message: string; questionId: string; history?: any[] }) {
    return this.testsService.chatAssist(body.message, body.questionId, body.history);
  }

  // === Test Attempt Management (consolidated from TestAttemptsController) ===

  @Post('attempts/:evalId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a new test attempt' })
  @ApiResponse({ status: 201, description: 'Test attempt started successfully', type: StartAttemptResponseDto })
  async startAttempt(@Request() req: any, @Param('evalId') evalId: string): Promise<StartAttemptResponseDto> {
    return this.testsService.startAttempt(evalId, req.user.id);
  }

  @Post('attempts/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit test results' })
  @ApiResponse({ status: 200, description: 'Test results submitted successfully' })
  async submitTestResults(@Body() body: SubmitTestResultsDto): Promise<{ attemptId: string; score: number; percentage: number }> {
    return this.testsService.submitTestResults(body);
  }

  // === Interactive Test Taking (consolidated from TestTakingController) ===

  @Post('taking/start/:evalId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start or resume interactive test session' })
  @ApiResponse({ status: 200, description: 'Test session started/resumed successfully', type: TestSessionStateDto })
  async getOrStartSession(@Request() req: any, @Param('evalId') evalId: string): Promise<TestSessionStateDto> {
    return this.testsService.getOrStartSession(req.user.id, evalId);
  }

  @Get('taking/:attemptId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current test session state' })
  @ApiResponse({ status: 200, description: 'Session state retrieved successfully', type: TestSessionStateDto })
  async getSessionState(@Param('attemptId') attemptId: string): Promise<TestSessionStateDto> {
    return this.testsService.getSessionState(attemptId);
  }

  @Post('taking/:attemptId/answer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record an answer for a question' })
  @ApiResponse({ status: 200, description: 'Answer recorded successfully', type: RecordAnswerResponseDto })
  async recordAnswer(@Param('attemptId') attemptId: string, @Body() body: RecordAnswerDto): Promise<RecordAnswerResponseDto> {
    return this.testsService.recordAnswer(attemptId, body.questionId, body.selectedAnswer, body.timeSpent);
  }

  @Post('taking/:attemptId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete the test' })
  @ApiResponse({ status: 200, description: 'Test completed successfully' })
  async completeTest(@Param('attemptId') attemptId: string): Promise<any> {
    return this.testsService.completeTest(attemptId);
  }
}
