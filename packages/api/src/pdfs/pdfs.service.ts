import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ParallelGenerationService } from "../ai/parallel-generation.service";

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

    async listPdfs(userId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        return this.prisma.pdf.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
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

    async chatPlan(message: string, pdfId: string, userId: string, history?: any[]) {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Get PDF info
        const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
        if (!pdf) throw new NotFoundException("PDF not found");

        // Build conversation history
        const conversationHistory = history || [];

        // Import prompt from prompts.ts
        const { TEST_PLAN_CHAT_PROMPT } = require("../ai/prompts");
        const systemPrompt = TEST_PLAN_CHAT_PROMPT(pdf.filename);

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "I understand! I'll help create a test plan. What would you like to study?" }] },
                ...conversationHistory.map(msg => ({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                }))
            ],
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();

        // Try to parse JSON from response
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // If not JSON, return as plain message
        }

        return {
            message: response,
            testPlan: null,
            shouldGenerate: false,
        };
    }

}
