import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PdfsService } from './pdfs.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { GenerateFlashcardsDto } from './dto/generate-flashcards.dto';
import { ObjectiveResponseDto } from './dto/objective-response.dto';
import { PdfResponseDto, PaginatedPdfResponseDto } from './dto/pdf-response.dto';

@ApiTags('pdfs')
@ApiBearerAuth()
@Controller('pdfs')
@UseGuards(JwtAuthGuard)
export class PdfsController {
  constructor(private readonly pdfsService: PdfsService) {}

  @Post(':id/generate')
  @ApiOperation({ summary: 'Generate flashcards from a PDF' })
  generateFlashcards(@Param('id') pdfId: string, @Body() dto: GenerateFlashcardsDto, @Request() req: any) {
    return this.pdfsService.generateFlashcards(pdfId, req.user.userId, dto.prompt);
  }

  @Get(':id/objectives')
  @ApiOperation({ summary: 'Get generated objectives and questions for a PDF' })
  @ApiResponse({ status: 200, type: [ObjectiveResponseDto] })
  getObjectives(@Param('id') pdfId: string) {
    return this.pdfsService.getObjectives(pdfId);
  }

  @Get(':id/rag-status')
  @ApiOperation({ summary: 'Check RAG ingestion status for a PDF' })
  getRagStatus(@Param('id') pdfId: string) {
    return this.pdfsService.getRagStatus(pdfId);
  }

  @Get()
  @ApiOperation({ summary: 'List all PDFs for the user with pagination' })
  @ApiResponse({ status: 200, type: PaginatedPdfResponseDto })
  listPdfs(@Request() req: any, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.pdfsService.listPdfs(req.user.userId, Number(page), Number(limit));
  }

  @Get('all')
  @ApiOperation({ summary: 'List all PDFs from all users (for taking tests)' })
  @ApiResponse({ status: 200, type: PaginatedPdfResponseDto })
  listAllPdfs(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.pdfsService.listAllPdfs(Number(page), Number(limit));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a PDF and all associated data (Admin only)' })
  @ApiResponse({ status: 200, description: 'PDF deleted successfully' })
  deletePdf(@Param('id') pdfId: string) {
    return this.pdfsService.deletePdf(pdfId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI to plan test generation' })
  @ApiResponse({ status: 200, description: 'AI response with test plan' })
  async chatPlan(@Body() dto: ChatMessageDto, @Request() req: any) {
    try {
      console.log('Chat request received:', {
        dto: JSON.stringify(dto),
        userId: req.user?.userId,
        hasUser: !!req.user,
      });

      if (!req.user?.userId) {
        throw new Error('User not authenticated');
      }

      if (!dto.message || !dto.pdfId) {
        throw new Error('Missing required fields: message or pdfId');
      }

      return await this.pdfsService.chatPlan(dto.message, dto.pdfId, req.user.userId, dto.conversationHistory);
    } catch (error) {
      console.error('Chat endpoint error:', error);
      throw error;
    }
  }

  @Post(':id/auto-generate-plan')
  @ApiOperation({ summary: 'Auto-generate initial test plan from PDF content' })
  @ApiResponse({ status: 200, description: 'Auto-generated test plan' })
  async autoGenerateTestPlan(@Param('id') pdfId: string, @Request() req: any) {
    return this.pdfsService.autoGenerateTestPlan(pdfId, req.user.userId);
  }
}
