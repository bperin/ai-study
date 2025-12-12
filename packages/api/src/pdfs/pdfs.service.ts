import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ParallelGenerationService } from "./parallel-generation.service";

@Injectable()
export class PdfsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly parallelGenerationService: ParallelGenerationService
    ) { }

    async generateFlashcards(pdfId: string, userId: string, userPrompt: string) {
        // 1. Get PDF from database
        const pdf = await this.prisma.pdf.findFirst({
            where: { id: pdfId, userId },
        });

        if (!pdf) {
            throw new NotFoundException("PDF not found");
        }

        // Create a session to track this generation event
        const session = await this.prisma.pdfSession.create({
            data: {
                pdfId,
                userId,
                userPreferences: { prompt: userPrompt },
                status: "generating",
            },
        });

        // 2. Use parallel generation for faster results
        const result = await this.parallelGenerationService.generateFlashcardsParallel(
            userPrompt,
            pdfId,
            pdf.filename,
            pdf.gcsPath || pdf.content || "" // GCS path (fallback to content for old records)
        );

        // Update session as completed
        await this.prisma.pdfSession.update({
            where: { id: session.id },
            data: { status: "completed" },
        });

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
                        _count: {
                            select: { mcqs: true },
                        },
                    },
                },
            },
        });
    }

    async startAttempt(pdfId: string, userId: string) {
        const attempt = await this.prisma.testAttempt.create({
            data: {
                userId,
                pdfId,
                score: 0,
                total: 0, // Will be updated on completion
                startedAt: new Date(),
            },
        });

        return {
            attemptId: attempt.id,
            pdfId: attempt.pdfId,
            startedAt: attempt.startedAt,
        };
    }

    async submitTest(attemptId: string, score: number, totalQuestions: number, missedQuestions: any[], allAnswers?: any[]) {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: attemptId },
            include: { pdf: true }
        });
        if (!attempt) throw new Error("Attempt not found");

        let analysis;
        try {
            // Analyze results with AI (now with web search and all answers)
            console.log(`Analyzing test results for PDF: ${attempt.pdfId}`);
            analysis = await this.parallelGenerationService.analyzeTestResults(attempt.pdfId, missedQuestions, allAnswers);
        } catch (error) {
            console.error("AI analysis failed, using fallback:", error);
            // Fallback analysis if AI fails
            const percentage = (score / totalQuestions) * 100;
            analysis = {
                summary: `You scored ${score} out of ${totalQuestions} (${Math.round(percentage)}%). ${percentage >= 80
                    ? "Great job! You have a strong understanding of the material."
                    : percentage >= 60
                        ? "Good effort! Review the areas you missed to improve further."
                        : "Keep studying! Focus on understanding the core concepts."
                    }`,
                weakAreas: missedQuestions.length > 0
                    ? missedQuestions.slice(0, 3).map(q => `Review: ${q.questionText.substring(0, 100)}...`)
                    : ["No specific weak areas identified - great job!"],
                studyStrategies: [
                    "Review the questions you missed and understand why the correct answer is right",
                    "Re-read the relevant sections of the study material",
                    "Try taking the test again to reinforce your knowledge",
                ],
            };
        }

        // Update attempt with feedback and score
        await this.prisma.testAttempt.update({
            where: { id: attemptId },
            data: {
                score,
                total: totalQuestions,
                percentage: (score / totalQuestions) * 100,
                completedAt: new Date(),
                feedback: analysis as any,
            },
        });

        return {
            attemptId,
            ...analysis,
        };
    }

    async forkPdf(pdfId: string, userId: string, newTitle?: string) {
        const originalPdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
        if (!originalPdf) throw new NotFoundException("PDF not found");

        // Create a new PDF record pointing to the same content/storage
        const newPdf = await this.prisma.pdf.create({
            data: {
                filename: newTitle || `${originalPdf.filename} (Copy)`,
                content: originalPdf.content,
                gcsPath: originalPdf.gcsPath,
                userId: userId,
            },
        });

        return newPdf;
    }

    async deletePdf(pdfId: string) {
        const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
        if (!pdf) throw new NotFoundException("PDF not found");

        // Delete in correct order due to foreign key constraints
        // 1. Delete user answers (linked to test attempts)
        await this.prisma.userAnswer.deleteMany({
            where: {
                attempt: {
                    pdfId,
                },
            },
        });

        // 2. Delete test attempts
        await this.prisma.testAttempt.deleteMany({
            where: { pdfId },
        });

        // 3. Delete MCQs (linked to objectives)
        await this.prisma.mcq.deleteMany({
            where: {
                objective: {
                    pdfId,
                },
            },
        });

        // 4. Delete objectives
        await this.prisma.objective.deleteMany({
            where: { pdfId },
        });

        // 5. Delete PDF sessions
        await this.prisma.pdfSession.deleteMany({
            where: { pdfId },
        });

        // 6. Finally delete the PDF itself
        await this.prisma.pdf.delete({
            where: { id: pdfId },
        });

        return {
            message: "PDF and all associated data deleted successfully",
            pdfId,
            filename: pdf.filename,
        };
    }
}
