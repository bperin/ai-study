import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LlmAgent, InMemoryRunner } from "@google/adk";
import { QUESTION_GENERATOR_INSTRUCTION, QUALITY_ANALYZER_INSTRUCTION, TEST_ANALYZER_INSTRUCTION } from "./prompts";
// @ts-ignore
import { createGetPdfInfoTool, createSaveObjectiveTool } from "./tools";

// Model constants
// @ts-ignore
const GEMINI_QUESTION_GENERATOR_MODEL = "gemini-2.5-flash";
// @ts-ignore
const GEMINI_QUALITY_ANALYZER_MODEL = "gemini-2.5-flash";

interface QuestionGenerationTask {
    difficulty: "easy" | "medium" | "hard";
    count: number;
}

@Injectable()
export class ParallelGenerationService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Generate flashcards using parallel agent execution
     */
    async generateFlashcardsParallel(userPrompt: string, pdfId: string, pdfFilename: string, gcsPath: string): Promise<{ objectivesCount: number; questionsCount: number; summary: string }> {
        // Parse user prompt to determine distribution
        const tasks = this.parseUserPrompt(userPrompt);

        // Step 1: Generate questions in parallel by difficulty
        const generationPromises = tasks.map((task) => this.generateQuestionsForDifficulty(task.difficulty, task.count, pdfId, pdfFilename, gcsPath, userPrompt));

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
        // Create specialized agent for this difficulty
        const agent = new LlmAgent({
            name: `question_generator_${difficulty}`,
            description: `Generates ${difficulty} difficulty questions`,
            model: GEMINI_QUESTION_GENERATOR_MODEL,
            instruction: `${QUESTION_GENERATOR_INSTRUCTION}

Focus on generating ${count} ${difficulty} difficulty questions.
${difficulty === "easy" ? "Make questions straightforward and test basic understanding." : ""}
${difficulty === "medium" ? "Make questions moderately challenging, testing application of concepts." : ""}
${difficulty === "hard" ? "Make questions challenging, testing deep understanding and critical thinking." : ""}

Use the save_objective tool to save the questions you generate.
`,
            tools: [createGetPdfInfoTool(pdfFilename, gcsPath), createSaveObjectiveTool(this.prisma, pdfId)],
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

        // Run agent
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // @ts-ignore
        for await (const _event of runner.runAsync({
            userId,
            sessionId,
            newMessage: {
                role: "user",
                parts: [{ text: `Generate ${count} ${difficulty} difficulty questions based on: ${userPrompt}` }],
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
     * Analyze test results to provide study strategies
     */
    async analyzeTestResults(pdfId: string, missedQuestions: any[]): Promise<{ summary: string; weakAreas: string[]; studyStrategies: string[] }> {
        // Fetch PDF info (assuming it's stored or we have access to retrieve it)
        const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
        if (!pdf) throw new Error("PDF not found");

        const pdfFilename = pdf.filename;
        const gcsPath = pdf.gcsPath || pdf.content || ""; // Fallback

        // Create analyzer agent
        const agent = new LlmAgent({
            name: "test_analyzer",
            description: "Analyzes test results and suggests study strategies",
            // @ts-ignore
            model: GEMINI_QUALITY_ANALYZER_MODEL, // Reusing the model constant
            instruction: TEST_ANALYZER_INSTRUCTION,
            tools: [createGetPdfInfoTool(pdfFilename, gcsPath)],
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

        let analysisResult = {
            summary: "Analysis failed to generate.",
            weakAreas: [],
            studyStrategies: [],
        };

        // @ts-ignore
        for await (const event of runner.runAsync({
            userId,
            sessionId,
            newMessage: {
                role: "user",
                parts: [
                    {
                        text: `Here are the questions the student missed: ${JSON.stringify(
                            missedQuestions,
                            null,
                            2
                        )}. Analyze these and cross-reference with the PDF content to provide study strategies. Return valid JSON.`,
                    },
                ],
            },
        })) {
            if (event.content?.parts?.[0]?.text) {
                try {
                    // Simple extraction of JSON if wrapped in markdown code blocks
                    const text = event.content.parts[0].text;
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        analysisResult = JSON.parse(jsonMatch[0]);
                    } else {
                        // Fallback if not pure JSON
                        analysisResult = JSON.parse(text);
                    }
                } catch (e) {
                    console.error("Failed to parse analysis result JSON", e);
                }
            }
        }

        return analysisResult;
    }
}
