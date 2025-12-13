import { Body, Controller, Get, Param, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiResponse, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TestTakingService } from "./test-taking.service";
import { TestSessionStateDto } from "./dto/test-session.dto";
import { RecordAnswerDto, RecordAnswerResponseDto } from "./dto/record-answer.dto";

@ApiTags("test-taking")
@Controller("tests/taking")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TestTakingController {
    constructor(private readonly testTakingService: TestTakingService) {}

    @Post("start/:pdfId")
    @ApiOperation({ summary: "Start or resume a test session" })
    @ApiResponse({ status: 201, type: TestSessionStateDto })
    async startSession(@Request() req: any, @Param("pdfId") pdfId: string) {
        return this.testTakingService.getOrStartSession(req.user.userId, pdfId);
    }

    @Get(":attemptId")
    @ApiOperation({ summary: "Get current test session state" })
    @ApiResponse({ status: 200, type: TestSessionStateDto })
    async getSession(@Param("attemptId") attemptId: string) {
        return this.testTakingService.getSessionState(attemptId);
    }

    @Post(":attemptId/answer")
    @ApiOperation({ summary: "Record an answer" })
    @ApiResponse({ status: 201, type: RecordAnswerResponseDto })
    async recordAnswer(@Param("attemptId") attemptId: string, @Body() body: RecordAnswerDto) {
        return this.testTakingService.recordAnswer(attemptId, body.questionId, body.selectedAnswer, body.timeSpent);
    }

    @Post(":attemptId/complete")
    @ApiOperation({ summary: "Complete the test" })
    @ApiResponse({ status: 201, description: "Test completed" })
    async completeTest(@Param("attemptId") attemptId: string) {
        return this.testTakingService.completeTest(attemptId);
    }
}
