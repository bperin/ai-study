import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GeminiService } from "./gemini.service";

@Injectable()
export class PdfsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly geminiService: GeminiService
    ) {}

    async generateFlashcards(pdfId: string, userId: string, userPrompt: string) {
        // 1. Get PDF from database
        const pdf = await this.prisma.pdf.findFirst({
            where: { id: pdfId, userId },
        });

        if (!pdf) {
            throw new NotFoundException("PDF not found");
        }

        // 2. Let the agent orchestrate everything using tools
        const result = await this.geminiService.generateFlashcards(
            userPrompt,
            pdfId,
            pdf.filename,
            pdf.content // GCS path
        );

        // 3. Fetch the created objectives from database
        const objectives = await this.prisma.objective.findMany({
            where: { pdfId },
            include: { mcqs: true },
        });

        return {
            message: "Flashcards generated successfully",
            objectivesCount: result.objectivesCount,
            questionsCount: result.questionsCount,
            summary: result.summary,
            objectives,
        };
    }
}
