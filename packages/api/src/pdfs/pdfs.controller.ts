import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfsService } from './pdfs.service';
import { GenerateFlashcardsDto } from './dto/generate-flashcards.dto';

@Controller('pdfs')
@UseGuards(JwtAuthGuard)
export class PdfsController {
    constructor(private readonly pdfsService: PdfsService) { }

    @Post(':id/generate')
    generateFlashcards(
        @Param('id') pdfId: string,
        @Body() dto: GenerateFlashcardsDto,
        @Request() req: any,
    ) {
        return this.pdfsService.generateFlashcards(pdfId, req.user.userId, dto.prompt);
    }
}
