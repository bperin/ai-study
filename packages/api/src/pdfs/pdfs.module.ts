import { Module } from "@nestjs/common";
import { PdfsController } from "./pdfs.controller";
import { PdfsService } from "./pdfs.service";
import { GeminiService } from "./gemini.service";
import { ParallelGenerationService } from "./parallel-generation.service";
import { PdfTextService } from "./pdf-text.service";
import { GcsService } from "./gcs.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [PdfsController],
    providers: [PdfsService, GeminiService, ParallelGenerationService, PdfTextService, GcsService],
    exports: [PdfsService, GcsService, PdfTextService],
})
export class PdfsModule { }
