import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { PdfsService } from "./pdfs.service";
import { GenerateFlashcardsDto } from "./dto/generate-flashcards.dto";
import { ObjectiveResponseDto } from "./dto/objective-response.dto";
import { PdfResponseDto, PaginatedPdfResponseDto } from "./dto/pdf-response.dto";

@ApiTags("pdfs")
@ApiBearerAuth()
@Controller("pdfs")
@UseGuards(JwtAuthGuard)
export class PdfsController {
    constructor(private readonly pdfsService: PdfsService) {}

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
    @ApiOperation({ summary: "List all PDFs for the user with pagination" })
    @ApiResponse({ status: 200, type: PaginatedPdfResponseDto })
    listPdfs(@Request() req: any, @Query("page") page: number = 1, @Query("limit") limit: number = 10) {
        return this.pdfsService.listPdfs(req.user.userId, Number(page), Number(limit));
    }

    @Delete(":id")
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: "Delete a PDF and all associated data (Admin only)" })
    @ApiResponse({ status: 200, description: "PDF deleted successfully" })
    deletePdf(@Param("id") pdfId: string) {
        return this.pdfsService.deletePdf(pdfId);
    }

    @Post("chat")
    @ApiOperation({ summary: "Chat with AI to plan test generation" })
    @ApiResponse({ status: 200, description: "AI response with test plan" })
    async chatPlan(@Body() body: { message: string; pdfId: string; history?: any[] }, @Request() req: any) {
        return this.pdfsService.chatPlan(body.message, body.pdfId, req.user.userId, body.history);
    }
}
