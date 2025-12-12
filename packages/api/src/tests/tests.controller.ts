import { Body, Controller, Post, Get, UseGuards, Request, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SubmitTestDto } from "./dto/submit-test.dto";
import { TestsService } from "./tests.service";
import { LeaderboardService } from "./leaderboard.service";
import { TestHistoryResponseDto, TestHistoryItemDto } from "./dto/test-results.dto";

@ApiTags("tests")
@Controller("tests")
export class TestsController {
    constructor(
        private testsService: TestsService,
        private leaderboardService: LeaderboardService
    ) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("submit")
    submitTest(@Request() req: any, @Body() dto: SubmitTestDto) {
        return this.testsService.submitTest(req.user.userId, dto);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("leaderboard")
    async getGlobalLeaderboard(@Query("limit") limit?: string) {
        const limitNum = limit ? parseInt(limit) : 10;
        return this.leaderboardService.getGlobalLeaderboard(limitNum);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("leaderboard/me")
    async getMyRank(@Request() req: any) {
        return this.leaderboardService.getUserRank(req.user.userId);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("leaderboard/pdf/:pdfId")
    async getPdfLeaderboard(@Param("pdfId") pdfId: string, @Query("limit") limit?: string) {
        const limitNum = limit ? parseInt(limit) : 10;
        return this.leaderboardService.getPdfLeaderboard(pdfId, limitNum);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("history")
    @ApiOperation({ summary: "Get user's test history with scores and reports" })
    @ApiResponse({ status: 200, type: TestHistoryResponseDto })
    async getTestHistory(@Request() req: any): Promise<TestHistoryResponseDto> {
        return this.testsService.getTestHistory(req.user.userId);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("attempt/:id")
    @ApiOperation({ summary: "Get detailed results for a specific test attempt" })
    @ApiResponse({ status: 200, type: TestHistoryItemDto })
    async getAttemptDetails(@Request() req: any, @Param("id") id: string): Promise<TestHistoryItemDto> {
        return this.testsService.getAttemptDetails(req.user.userId, id);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("chat")
    @ApiOperation({ summary: "Chat with AI for help on a question" })
    @ApiResponse({ status: 200, description: "AI assistance response" })
    async chatAssist(@Body() body: { message: string; questionId: string; history?: any[] }) {
        return this.testsService.chatAssist(body.message, body.questionId, body.history);
    }
}
