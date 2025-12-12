import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ParallelGenerationService } from "./parallel-generation.service";

@Injectable()
export class PdfsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly parallelGenerationService: ParallelGenerationService
    ) {}

    async generateFlashcards(pdfId: string, userId: string, userPrompt: string) {
        // 1. Get PDF from database
        const pdf = await this.prisma.pdf.findFirst({
            where: { id: pdfId, userId },
        });

        if (!pdf) {
            throw new NotFoundException("PDF not found");
        }

        // 2. Use parallel generation for faster results
        const result = await this.parallelGenerationService.generateFlashcardsParallel(
            userPrompt,
            pdfId,
            pdf.filename,
            pdf.gcsPath || pdf.content || "" // GCS path (fallback to content for old records)
        );

        // 3. Fetch the created objectives from database
        const objectives = await this.prisma.objective.findMany({
            where: { pdfId },
            include: { mcqs: true },
        });

        return {
            message: "Flashcards generated successfully with parallel agents",
            objectivesCount: result.objectivesCount,
            questionsCount: result.questionsCount,
            summary: result.summary,
            objectives,
        };
    }

    async getObjectives(pdfId: string) {
        return this.prisma.objective.findMany({
            where: { pdfId },
            include: { mcqs: true },
        });
    }

    async listPdfs(userId: string) {
        return this.prisma.pdf.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                filename: true,
                createdAt: true,
                objectives: {
                    select: {
                        title: true,
                        difficulty: true,
                    },
                },
            },
        });
    }

    async analyzeTest(pdfId: string, missedQuestions: any[]) {
        return this.parallelGenerationService.analyzeTestResults(pdfId, missedQuestions);
    }
}
