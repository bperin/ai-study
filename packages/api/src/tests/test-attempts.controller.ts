import { Body, Controller, Param, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TestAttemptsService } from "./test-attempts.service";
import { StartAttemptResponseDto } from "./dto/start-attempt-response.dto";
import { SubmitTestResultsDto, TestAnalysisResponseDto } from "./dto/test-results.dto";

@ApiTags("test-attempts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tests/attempts")
export class TestAttemptsController {
    constructor(private readonly testAttemptsService: TestAttemptsService) {}

    @Post(":pdfId/start")
    @ApiOperation({ summary: "Start a new test attempt" })
    @ApiResponse({ status: 201, type: StartAttemptResponseDto })
    startAttempt(@Param("pdfId") pdfId: string, @Request() req: any): Promise<StartAttemptResponseDto> {
        return this.testAttemptsService.startAttempt(pdfId, req.user.userId);
    }

    @Post("submit")
    @ApiOperation({ summary: "Submit a test attempt and get analysis" })
    @ApiResponse({ status: 200, type: TestAnalysisResponseDto })
    submitAttempt(@Body() body: SubmitTestResultsDto) {
        return this.testAttemptsService.submitTest(body);
    }
}
