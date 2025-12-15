import { Injectable, NotFoundException } from "@nestjs/common";
import { Mcq } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SubmitTestDto } from "./dto/submit-test.dto";
import { TestHistoryResponseDto, TestHistoryItemDto } from "./dto/test-results.dto";
import { TestStatsDto } from "./dto/test-stats.dto";
import { ChatAssistanceResponseDto } from "./dto/chat-assistance.dto";
import { GEMINI_MODEL } from "../constants/models";

@Injectable()
export class TestsService {
    constructor(private prisma: PrismaService) {}

    async submitTest(userId: string, dto: SubmitTestDto) {
        // 1. Fetch MCQs to check answers
        const mcqIds = dto.answers.map((a) => a.mcqId);
        const mcqs = await this.prisma.mcq.findMany({
            where: { id: { in: mcqIds } },
        });
        const mcqMap = new Map<string, Mcq>(mcqs.map((m) => [m.id, m]));

        // 2. Calculate score and prepare answers
        let score = 0;
        const answerData = dto.answers.map((answer) => {
            const mcq = mcqMap.get(answer.mcqId);
            if (!mcq) throw new Error(`MCQ not found: ${answer.mcqId}`);

            const isCorrect = mcq.correctIdx === answer.selectedIdx;
            if (isCorrect) score++;

            return {
                mcqId: answer.mcqId,
                selectedIdx: answer.selectedIdx,
                isCorrect,
            };
        });

        // 3. Create Attempt
        const total = dto.answers.length;
        const percentage = total > 0 ? (score / total) * 100 : 0;

        return this.prisma.testAttempt.create({
            data: {
                userId,
                pdfId: dto.pdfId,
                score,
                total,
                percentage,
                completedAt: new Date(),
                answers: {
                    create: answerData,
                },
            },
            include: {
                answers: true,
            },
        });
    }

    async getTestHistory(userId: string): Promise<TestHistoryResponseDto> {
        const attempts = await this.prisma.testAttempt.findMany({
            where: { userId },
            include: {
                pdf: true,
                answers: {
                    include: {
                        mcq: true,
                    },
                },
            },
            orderBy: [
                { completedAt: { sort: "desc", nulls: "last" } },
                { startedAt: "desc" }
            ],
        });

        return TestHistoryResponseDto.fromEntities(attempts);
    }

    async getAllTestHistory(): Promise<TestHistoryResponseDto> {
        const attempts = await this.prisma.testAttempt.findMany({
            include: {
                pdf: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
                answers: {
                    include: {
                        mcq: true,
                    },
                },
            },
            orderBy: [
                { completedAt: { sort: "desc", nulls: "last" } },
                { startedAt: "desc" }
            ],
        });

        return TestHistoryResponseDto.fromEntities(attempts);
    }

    async getTestStats(pdfId: string) {
        const attempts = await this.prisma.testAttempt.findMany({
            where: { 
                pdfId,
                completedAt: { not: null }
            },
            include: {
                user: { select: { email: true } }
            },
            orderBy: { percentage: "desc" }
        });

        if (attempts.length === 0) {
            return {
                attemptCount: 0,
                avgScore: 0,
                topScorer: null,
                topScore: null
            };
        }

        const avgScore = Math.round(
            attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length
        );
        const topAttempt = attempts[0];

        return {
            attemptCount: attempts.length,
            avgScore,
            topScorer: topAttempt.user.email.split("@")[0],
            topScore: Math.round(topAttempt.percentage || 0)
        };
    }

    async getAttemptDetails(userId: string, attemptId: string): Promise<TestHistoryItemDto> {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: attemptId },
            include: {
                pdf: true,
                answers: {
                    include: {
                        mcq: true,
                    },
                },
            },
        });

        if (!attempt || attempt.userId !== userId) {
            throw new NotFoundException("Attempt not found");
        }

        return TestHistoryItemDto.fromEntity(attempt);
    }

    async chatAssist(message: string, questionId: string, history?: any[]) {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const mcq = await this.prisma.mcq.findUnique({
            where: { id: questionId },
            include: { objective: { include: { pdf: true } } },
        });
        if (!mcq) throw new NotFoundException("Question not found");

        const pdfContent = mcq.objective.pdf.content || ""; // Or handle GCS path if needed (simplified for now as content usually has text)

        const { TEST_ASSISTANCE_CHAT_PROMPT } = require("../ai/prompts");
        const systemPrompt = TEST_ASSISTANCE_CHAT_PROMPT(mcq.question, mcq.options, pdfContent);

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "I understand. I will help the student with this question without giving away the answer." }] },
                ...(history || []).map((msg) => ({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }],
                })),
            ],
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();

        return {
            message: response,
        };
    }

    async getChatAssistance(message: string, questionId: string, pdfId: string, userId: string) {
        // Get the question and PDF info
        const question = await this.prisma.mcq.findUnique({
            where: { id: questionId },
            include: { objective: true }
        });

        if (!question) {
            throw new NotFoundException("Question not found");
        }

        const pdf = await this.prisma.pdf.findUnique({
            where: { id: pdfId }
        });

        if (!pdf) {
            throw new NotFoundException("PDF not found");
        }

        // Extract PDF content for context
        let pdfContent = "";
        if (pdf.gcsPath) {
            try {
                const { GcsService } = require("../pdfs/gcs.service");
                const { PdfTextService } = require("../pdfs/pdf-text.service");
                const gcsService = new GcsService();
                const pdfTextService = new PdfTextService();
                
                const buffer = await gcsService.downloadFile(pdf.gcsPath);
                const extracted = await pdfTextService.extractText(buffer);
                pdfContent = extracted.structuredText.substring(0, 10000); // Limit for context
            } catch (error) {
                console.error("Failed to extract PDF content for chat assistance:", error);
            }
        }

        // Create test assistance agent
        const { createTestAssistanceAgent } = require("../ai/agents");
        const { InMemoryRunner } = require("@google/adk");
        
        const agent = createTestAssistanceAgent(
            question.question,
            question.options,
            pdfContent
        );
        const runner = new InMemoryRunner();

        const result = await runner.run(agent, message);
        
        return {
            message: result.text,
            questionContext: question.question,
            helpful: true
        } as ChatAssistanceResponseDto;
    }
}
