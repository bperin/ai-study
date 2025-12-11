import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LlmAgent, InMemoryRunner, getFunctionCalls } from "@google/adk";
import { PrismaService } from "../prisma/prisma.service";
import { ROOT_AGENT_INSTRUCTION } from "./prompts";
import { createSaveObjectiveTool, createGetPdfInfoTool, createCompletionTool } from "./tools";

// Model constant for orchestrator
const GEMINI_ORCHESTRATOR_MODEL = "gemini-2.5-flash";

@Injectable()
export class GeminiService {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {
        const apiKey = this.configService.get<string>("GOOGLE_API_KEY");
        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY is not set in environment variables");
        }

        // Set API key as environment variable for ADK
        process.env.GOOGLE_GENAI_API_KEY = apiKey;
    }

    /**
     * Generate flashcards using an agentic approach with tools
     */
    async generateFlashcards(userPrompt: string, pdfId: string, pdfFilename: string, gcsPath: string): Promise<{ objectivesCount: number; questionsCount: number; summary: string }> {
        // Create tools for this specific PDF
        const tools = [createSaveObjectiveTool(this.prisma, pdfId), createGetPdfInfoTool(pdfFilename, gcsPath), createCompletionTool()];

        // Create the root orchestrator agent
        const orchestratorAgent = new LlmAgent({
            name: "flashcard_orchestrator",
            description: "Orchestrates the generation of educational flashcards from PDF content",
            model: GEMINI_ORCHESTRATOR_MODEL,
            instruction: ROOT_AGENT_INSTRUCTION,
            tools,
        });

        // Create runner
        const runner = new InMemoryRunner({
            agent: orchestratorAgent,
            appName: "flashcard-generator",
        });

        // Track completion data
        let completionData: any = null;
        let objectivesCreated = 0;

        const sessionId = `pdf-${pdfId}-${Date.now()}`;
        const userId = "system";

        // Create the session first (matching Python ADK pattern)
        const session = await runner.sessionService.createSession({
            appName: "flashcard-generator",
            userId,
            sessionId,
            state: {
                pdfId,
                pdfFilename,
                gcsPath,
                userPrompt,
            },
        });

        // Run the agent with the user's request
        for await (const event of runner.runAsync({
            userId,
            sessionId: session.id,
            newMessage: {
                role: "user",
                parts: [{ text: userPrompt }],
            },
        })) {
            // Check for function calls in this event
            const functionCalls = getFunctionCalls(event);

            for (const call of functionCalls) {
                console.log(`Agent called function: ${call.name}`);

                if (call.name === "save_objective") {
                    objectivesCreated++;
                }

                if (call.name === "complete_generation") {
                    completionData = call.args;
                }
            }
        }

        // Return the completion data or defaults
        return {
            objectivesCount: completionData?.totalObjectives || objectivesCreated,
            questionsCount: completionData?.totalQuestions || 0,
            summary: completionData?.summary || "Flashcards generated successfully",
        };
    }
}
