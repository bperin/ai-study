import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GcsService } from "../pdfs/gcs.service";
import { PdfTextService } from "../pdfs/pdf-text.service";
import { LlmAgent, InMemoryRunner } from "@google/adk";
import * as pdfParse from "pdf-parse";
import { QUESTION_GENERATOR_INSTRUCTION, QUALITY_ANALYZER_INSTRUCTION, TEST_ANALYZER_INSTRUCTION, TEST_ANALYSIS_RESPONSE_SCHEMA, COMPREHENSIVE_ANALYSIS_PROMPT } from "./prompts";
import { GEMINI_MODEL } from "../constants/models";
// @ts-ignore
import { createGetPdfInfoTool, createSaveObjectiveTool, createWebSearchTool } from "./tools";

// Model constants
// @ts-ignore
const GEMINI_QUESTION_GENERATOR_MODEL = GEMINI_MODEL;
// @ts-ignore
const GEMINI_QUALITY_ANALYZER_MODEL = GEMINI_MODEL;

interface QuestionGenerationTask {
    difficulty: "easy" | "medium" | "hard";
    count: number;
}

@Injectable()
export class ParallelGenerationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly gcsService: GcsService,
        private readonly pdfTextService: PdfTextService
    ) {}

    /**
     * Generate flashcards using parallel agent execution
     */
    async generateFlashcardsParallel(userPrompt: string, pdfId: string, pdfFilename: string, gcsPath: string): Promise<{ objectivesCount: number; questionsCount: number; summary: string }> {
        // Parse user prompt to determine distribution
        const tasks = this.parseUserPrompt(userPrompt);

        // Step 1: Generate questions in parallel by difficulty
        // Optimization: Break down large tasks into smaller chunks (max 5 questions per agent) for faster parallel execution
        const CHUNK_SIZE = 5;
        const chunkedTasks = tasks.flatMap((task) => {
            const chunks: QuestionGenerationTask[] = [];
            let remaining = task.count;
            while (remaining > 0) {
                const count = Math.min(remaining, CHUNK_SIZE);
                chunks.push({ difficulty: task.difficulty, count });
                remaining -= count;
            }
            return chunks;
        });

        const generationPromises = chunkedTasks.map((task) => this.generateQuestionsForDifficulty(task.difficulty, task.count, pdfId, pdfFilename, gcsPath, userPrompt));

        // Wait for all parallel generations to complete
        const results = await Promise.all(generationPromises);

        // Step 2: Aggregate results
        const totalObjectives = results.reduce((sum, r) => sum + r.objectivesCreated, 0);
        const totalQuestions = results.reduce((sum, r) => sum + r.questionsCreated, 0);

        // Step 3: Quality analysis (after all questions are generated)
        const qualitySummary = await this.runQualityAnalysis(pdfId);

        return {
            objectivesCount: totalObjectives,
            questionsCount: totalQuestions,
            summary: `Generated ${totalQuestions} questions across ${totalObjectives} objectives. ${qualitySummary}`,
        };
    }

    /**
     * Parse user prompt to determine question distribution
     */
    private parseUserPrompt(userPrompt: string): QuestionGenerationTask[] {
        const tasks: QuestionGenerationTask[] = [];

        // Extract total number of questions
        const totalMatch = userPrompt.match(/(\d+)\s+questions?/i);
        const total = totalMatch ? parseInt(totalMatch[1]) : 20; // Default to 20 questions

        // Check for difficulty mentions
        const hasEasy = /easy/i.test(userPrompt);
        const hasMedium = /medium/i.test(userPrompt);
        const hasHard = /hard/i.test(userPrompt);

        // If specific difficulties mentioned, distribute evenly
        if (hasEasy || hasMedium || hasHard) {
            const difficulties = [hasEasy && "easy", hasMedium && "medium", hasHard && "hard"].filter(Boolean) as Array<"easy" | "medium" | "hard">;
            const perDifficulty = Math.floor(total / difficulties.length);

            difficulties.forEach((difficulty) => {
                tasks.push({ difficulty, count: perDifficulty });
            });
        } else {
            // Default: 5 easy, 5 medium, 5 hard, 5 picture cards
            // Distribute evenly across difficulties
            if (total >= 12) {
                // For 12+ questions: balanced distribution
                const perDifficulty = Math.floor(total / 3);
                tasks.push({ difficulty: "easy", count: perDifficulty });
                tasks.push({ difficulty: "medium", count: perDifficulty });
                tasks.push({ difficulty: "hard", count: total - perDifficulty * 2 }); // Remainder goes to hard
            } else {
                // For fewer questions: distribute as evenly as possible
                const easy = Math.ceil(total / 3);
                const medium = Math.ceil((total - easy) / 2);
                const hard = total - easy - medium;

                if (easy > 0) tasks.push({ difficulty: "easy", count: easy });
                if (medium > 0) tasks.push({ difficulty: "medium", count: medium });
                if (hard > 0) tasks.push({ difficulty: "hard", count: hard });
            }
        }

        return tasks;
    }

    /**
     * Generate questions for a specific difficulty level
     */
    private async generateQuestionsForDifficulty(difficulty: "easy" | "medium" | "hard", count: number, pdfId: string, pdfFilename: string, gcsPath: string, userPrompt: string): Promise<{ objectivesCreated: number; questionsCreated: number }> {
        // Extract PDF content first
        let pdfContent = "";
        try {
            const buffer = await this.gcsService.downloadFile(gcsPath);
            if (this.pdfTextService) {
                const extracted = await this.pdfTextService.extractText(buffer);
                pdfContent = extracted.structuredText.substring(0, 500000); // 500k chars ~ 125k tokens
            } else {
                const data = await pdfParse(buffer);
                pdfContent = data.text.substring(0, 500000);
            }
            console.log(`PDF content extracted for question generation (${pdfContent.length} chars):`, pdfContent.substring(0, 200) + "...");
        } catch (error) {
            console.error("Error extracting PDF content for question generation:", error);
            console.log("PDF content is empty - agents will have no context");
        }

        // Create specialized agent for this difficulty with PDF content
        const agent = new LlmAgent({
            name: `question_generator_${difficulty}`,
            description: `Generates ${difficulty} difficulty questions`,
            model: GEMINI_QUESTION_GENERATOR_MODEL,
            instruction: QUESTION_GENERATOR_INSTRUCTION(pdfContent, userPrompt, difficulty, count),
            tools: [createSaveObjectiveTool(this.prisma, pdfId), createWebSearchTool()],
        });

        const runner = new InMemoryRunner({
            agent,
            appName: "flashcard-generator",
        });

        const sessionId = `pdf-${pdfId}-${difficulty}-${Date.now()}`;
        const userId = "system";

        // Create session
        await runner.sessionService.createSession({
            appName: "flashcard-generator",
            userId,
            sessionId,
            state: { pdfId, difficulty, count },
        });

        // Extract PDF text directly to ensure the model has it
        let pdfContext = "";
        try {
            const buffer = await this.gcsService.downloadFile(gcsPath);
            // Use existing PDF service if available, else simple parse
            if (this.pdfTextService) {
                const extracted = await this.pdfTextService.extractText(buffer);
                pdfContext = extracted.structuredText.substring(0, 500000); // 500k chars ~ 125k tokens
            } else {
                const data = await pdfParse(buffer);
                pdfContext = data.text.substring(0, 500000);
            }
        } catch (error) {
            console.error("Error pre-fetching PDF content:", error);
            // Fallback: Agent will try to use tool if context is missing, though we'd prefer direct injection
        }

        const prompt = `
Generate ${count} ${difficulty} difficulty questions.

USER INSTRUCTIONS: "${userPrompt}"

SOURCE MATERIAL:
${pdfContext}
`;

        // Run agent
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // @ts-ignore
        for await (const _event of runner.runAsync({
            userId,
            sessionId,
            newMessage: {
                role: "user",
                parts: [{ text: prompt }],
            },
        })) {
            // Tools are executed automatically by the runner
        }

        // Check database for results
        const objectives = await this.prisma.objective.findMany({
            where: {
                pdfId,
                difficulty,
            },
            include: {
                _count: {
                    select: { mcqs: true },
                },
            },
        });

        const objectivesCreated = objectives.length;
        const questionsCreated = objectives.reduce((sum, obj) => sum + obj._count.mcqs, 0);

        return {
            objectivesCreated,
            questionsCreated,
        };
    }

    /**
     * Run quality analysis on all generated questions
     */
    private async runQualityAnalysis(pdfId: string): Promise<string> {
        // Fetch all questions for this PDF
        const objectives = await this.prisma.objective.findMany({
            where: { pdfId },
            include: { mcqs: true },
        });

        // Create quality analyzer agent
        const agent = new LlmAgent({
            name: "quality_analyzer",
            description: "Analyzes quality of generated flashcards",
            model: GEMINI_QUALITY_ANALYZER_MODEL,
            instruction: QUALITY_ANALYZER_INSTRUCTION,
        });

        const runner = new InMemoryRunner({
            agent,
            appName: "flashcard-generator",
        });

        const sessionId = `quality-${pdfId}-${Date.now()}`;
        const userId = "system";

        await runner.sessionService.createSession({
            appName: "flashcard-generator",
            userId,
            sessionId,
            state: { objectives },
        });

        let qualitySummary = "Quality analysis pending.";

        for await (const event of runner.runAsync({
            userId,
            sessionId,
            newMessage: {
                role: "user",
                parts: [
                    {
                        text: `Analyze the quality of these flashcards: ${JSON.stringify(objectives, null, 2)}`,
                    },
                ],
            },
        })) {
            // Extract quality summary from agent response
            if (event.content?.parts?.[0]?.text) {
                qualitySummary = event.content.parts[0].text;
            }
        }

        return qualitySummary;
    }

    /**
     * Analyze test results to provide study strategies with web-enhanced resources
     */
    async analyzeTestResults(
        pdfId: string,
        missedQuestions: any[],
        allAnswers?: any[]
    ): Promise<{
        report: string;
    }> {
        // Fetch PDF info
        const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
        if (!pdf) throw new Error("PDF not found");

        const pdfFilename = pdf.filename;
        const gcsPath = pdf.gcsPath || pdf.content || "";

        // Create analyzer agent with web search capability
        const agent = new LlmAgent({
            name: "test_analyzer",
            description: "Analyzes test results and suggests study strategies with web-enhanced resources",
            model: GEMINI_QUALITY_ANALYZER_MODEL,
            instruction: TEST_ANALYZER_INSTRUCTION,
            tools: [
                createGetPdfInfoTool(pdfFilename, gcsPath, this.gcsService, this.pdfTextService),
                createWebSearchTool(), // Enable web search for finding resources
            ],
        });

        const runner = new InMemoryRunner({
            agent,
            appName: "flashcard-generator",
        });

        const sessionId = `analysis-${pdfId}-${Date.now()}`;
        const userId = "system";

        await runner.sessionService.createSession({
            appName: "flashcard-generator",
            userId,
            sessionId,
            state: { pdfId, missedQuestions },
        });

        // Extract PDF text directly to ensure the model has it
        let pdfContext = "";
        try {
            const buffer = await this.gcsService.downloadFile(gcsPath);
            if (this.pdfTextService) {
                const extracted = await this.pdfTextService.extractText(buffer);
                pdfContext = extracted.structuredText.substring(0, 500000);
            } else {
                const data = await pdfParse(buffer);
                pdfContext = data.text.substring(0, 500000);
            }
        } catch (error) {
            console.error("Error pre-fetching PDF content for analysis:", error);
        }

        let analysisResult = {
            report: "Analysis failed to generate. Please try again.",
        };

        // @ts-ignore
        for await (const event of runner.runAsync({
            userId,
            sessionId,
            newMessage: {
                role: "user",
                parts: [
                    {
                        text: COMPREHENSIVE_ANALYSIS_PROMPT.replace("{missedQuestions}", JSON.stringify(missedQuestions, null, 2))
                            .replace(
                                "{allAnswersSection}",
                                allAnswers && allAnswers.length > 0
                                    ? `
ALL student answers (correct and incorrect):
${JSON.stringify(allAnswers, null, 2)}
`
                                    : ""
                            )
                            .replace("{pdfContext}", pdfContext),
                    },
                ],
            },
        })) {
            if (event.content?.parts?.[0]?.text) {
                // Store the raw text response as the report
                analysisResult = {
                    report: event.content.parts[0].text.trim(),
                };
            }
        }

        return analysisResult;
    }
}
