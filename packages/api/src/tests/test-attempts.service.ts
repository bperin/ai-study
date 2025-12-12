import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ParallelGenerationService } from "../ai/parallel-generation.service";
import { StartAttemptResponseDto } from "./dto/start-attempt-response.dto";
import { SubmitTestResultsDto, TestAnalysisResponseDto } from "./dto/test-results.dto";

@Injectable()
export class TestAttemptsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly parallelGenerationService: ParallelGenerationService
    ) {}

    async startAttempt(pdfId: string, userId: string): Promise<StartAttemptResponseDto> {
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

    async submitTest(body: SubmitTestResultsDto): Promise<TestAnalysisResponseDto & { attemptId: string }> {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: body.attemptId },
            include: { pdf: true },
        });

        if (!attempt) {
            throw new NotFoundException("Attempt not found");
        }

        let analysis;
        try {
            // Analyze results with AI (now with web search and all answers)
            console.log(`Analyzing test results for PDF: ${attempt.pdfId}`);
            analysis = await this.parallelGenerationService.analyzeTestResults(attempt.pdfId, body.missedQuestions, body.allAnswers);

            // The analysis already contains the markdown report
        } catch (error) {
            console.error("AI analysis failed, using fallback:", error);
            // Fallback analysis if AI fails
            const percentage = Math.round((body.score / body.totalQuestions) * 100);
            analysis = {
                report: `# Test Performance Analysis Report

## Executive Summary
You scored ${body.score} out of ${body.totalQuestions} (${percentage}%). ${percentage >= 80 ? "Great job! You have a strong understanding of the material." : percentage >= 60 ? "Good effort! Review the areas you missed to improve further." : "Keep studying! Focus on understanding the core concepts."}

## Areas for Improvement
${
    body.missedQuestions.length > 0
        ? body.missedQuestions
              .slice(0, 3)
              .map((q) => `- **${q.questionText}**\n  - Your answer: ${q.selectedAnswer}\n  - Correct answer: ${q.correctAnswer}\n  - Review this concept in the study material`)
              .join("\n\n")
        : "- No specific areas identified - great job!"
}

## Study Strategy Recommendations
- Review the questions you missed and understand why the correct answer is right
- Re-read the relevant sections of the study material
- Try taking the test again to reinforce your knowledge

## Next Steps
Keep practicing and focus on understanding the underlying concepts. Each attempt helps you learn!`,
            };
        }

        // Update attempt with feedback and score
        await this.prisma.testAttempt.update({
            where: { id: body.attemptId },
            data: {
                score: body.score,
                total: body.totalQuestions,
                percentage: (body.score / body.totalQuestions) * 100,
                completedAt: new Date(),
                feedback: analysis as any,
            },
        });

        return {
            attemptId: body.attemptId,
            ...(analysis as TestAnalysisResponseDto),
        };
    }
}
