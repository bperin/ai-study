import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestService } from './services/ingest.service';
import { RagService } from './services/rag.service';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';
import { CreateGcsDocumentDto } from './dto/create-gcs-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('v1/documents')
export class RagController {
  constructor(
    private readonly ingestService: IngestService,
    private readonly ragService: RagService,
  ) {}

  @Post()
  async createFromText(@Body() body: CreateTextDocumentDto) {
    const { text, title } = body;
    return this.ingestService.createFromText(title, text);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: Express.Multer.File, @Body('title') title?: string) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }
    return this.ingestService.createFromUpload(title, file);
  }

  @Post('from-gcs')
  async fromGcs(@Body() body: CreateGcsDocumentDto) {
    const { gcsUri, title } = body;
    return this.ingestService.createFromGcs(title, gcsUri);
  }

  @Get(':documentId')
  async getDocument(@Param('documentId') documentId: string) {
    return this.ragService.getDocument(documentId);
  }

  @Post('reprocess-all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async reprocessAll() {
    return this.ingestService.reprocessAllDocuments();
  }

  @Post(':documentId/reprocess')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async reprocess(@Param('documentId') documentId: string) {
    return this.ingestService.reprocessDocument(documentId);
  }

  @Get(':documentId/chunks')
  async listChunks(@Param('documentId') documentId: string, @Query('limit', new ParseIntPipe({ optional: true })) limit = 50, @Query('offset', new ParseIntPipe({ optional: true })) offset = 0) {
    return this.ragService.listChunks(documentId, limit, offset);
  }

  @Post(':documentId/query')
  async queryDocument(@Param('documentId') documentId: string, @Body() body: QueryDocumentDto) {
    const { question, topK } = body;
    return this.ragService.queryDocument(documentId, question, topK ?? 6);
  }
}
