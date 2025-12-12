import { Controller, Post, Get, Param, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PdfsService } from "./pdfs.service";
import { GenerateFlashcardsDto } from "./dto/generate-flashcards.dto";
import { ObjectiveResponseDto } from "./dto/objective-response.dto";
import { PdfResponseDto } from "./dto/pdf-response.dto";
import { SubmitTestResultsDto, TestAnalysisResponseDto } from "./dto/submit-test-results.dto";
import { StartAttemptResponseDto } from "./dto/start-attempt-response.dto";

@ApiTags("pdfs")
@ApiBearerAuth()
@Controller("pdfs")
@UseGuards(JwtAuthGuard)
export class PdfsController {
    constructor(private readonly pdfsService: PdfsService) { }

    @Post(":id/generate")
    @ApiOperation({ summary: "Generate flashcards from a PDF" })
    generateFlashcards(@Param("id") pdfId: string, @Body() dto: GenerateFlashcardsDto, @Request() req: any) {
        return this.pdfsService.generateFlashcards(pdfId, req.user.userId, dto.prompt);
    }

    @Get(":id/objectives")
    @ApiOperation({ summary: "Get generated objectives and questions for a PDF" })
    @ApiResponse({ status: 200, type: [ObjectiveResponseDto] })
    getObjectives(@Param("id") pdfId: string) {
        return this.pdfsService.getObjectives(pdfId);
    }

    @Get()
    @ApiOperation({ summary: "List all PDFs for the user" })
    @ApiResponse({ status: 200, type: [PdfResponseDto] })
    listPdfs(@Request() req: any) {
        return this.pdfsService.listPdfs(req.user.userId);
    }

    @Post(":id/start-attempt")
    @ApiOperation({ summary: "Start a new test attempt" })
    @ApiResponse({ status: 201, type: StartAttemptResponseDto })
    startAttempt(@Param("id") pdfId: string, @Request() req: any) {
        return this.pdfsService.startAttempt(pdfId, req.user.userId);
    }

    @Post("submit-attempt")
    @ApiOperation({ summary: "Submit test attempt and get AI-enhanced analysis with web resources" })
    @ApiResponse({ status: 200, type: TestAnalysisResponseDto })
    submitAttempt(@Body() body: SubmitTestResultsDto) {
        return this.pdfsService.submitTest(
            body.attemptId,
            body.score,
            body.totalQuestions,
            body.missedQuestions,
            body.allAnswers
        );
    }
}
