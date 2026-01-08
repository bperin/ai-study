import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';
import { AdminGuard } from '../../shared/admin.guard';
import { DocumentsService } from './documents.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { DocumentResponseDto, PaginatedDocumentResponseDto } from './dto/document-response.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all documents for the user with pagination' })
  @ApiResponse({ status: 200, type: PaginatedDocumentResponseDto })
  listDocuments(@Request() req: any, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.documentsService.listDocuments(req.user.userId, Number(page), Number(limit));
  }

  @Get('all')
  @ApiOperation({ summary: 'List all documents from all users (for taking tests)' })
  @ApiResponse({ status: 200, type: PaginatedDocumentResponseDto })
  listAllDocuments(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.documentsService.listAllDocuments(Number(page), Number(limit));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a PDF and all associated data (Admin only)' })
  @ApiResponse({ status: 200, description: 'PDF deleted successfully' })
  deletePdf(@Param('id') documentId: string) {
    return this.documentsService.deleteDocument(documentId);
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

      if (!dto.message || !dto.documentId) {
        throw new Error('Missing required fields: message or documentId');
      }

      return await this.documentsService.chatPlan(dto.message, dto.documentId, req.user.userId, dto.conversationHistory);
    } catch (error) {
      console.error('Chat endpoint error:', error);
      throw error;
    }
  }

  @Post(':id/auto-generate-plan')
  @ApiOperation({ summary: 'Auto-generate initial test plan from PDF content' })
  @ApiResponse({ status: 200, description: 'Auto-generated test plan' })
  async autoGenerateTestPlan(@Param('id') documentId: string, @Request() req: any) {
    return this.documentsService.autoGenerateTestPlan(documentId, req.user.userId);
  }
}
