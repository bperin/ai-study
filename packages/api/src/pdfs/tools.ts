import { FunctionTool } from "@google/adk";
import { PrismaService } from "../prisma/prisma.service";
import { z } from "zod";
import * as pdfParse from "pdf-parse";
import { GcsService } from "./gcs.service";

/**
 * Tool for saving a single objective with its questions to the database
 */
export function createSaveObjectiveTool(prisma: PrismaService, pdfId: string) {
    const parametersSchema = z.object({
        title: z.string().describe("The title of the learning objective"),
        difficulty: z.enum(["easy", "medium", "hard"]).describe("The difficulty level"),
        questions: z
            .array(
                z.object({
                    question: z.string().describe("The question text"),
                    options: z.array(z.string()).length(4).describe("Four answer options"),
                    correctIndex: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
                    explanation: z.string().optional().describe("Explanation of the correct answer"),
                    hint: z.string().optional().describe("A helpful hint for the question"),
                })
            )
            .describe("Array of multiple choice questions for this objective"),
    });

    return new FunctionTool({
        name: "save_objective",
        description: "Saves a learning objective with its multiple choice questions to the database",
        parameters: parametersSchema,
        execute: async (params) => {
            const objective = await prisma.objective.create({
                data: {
                    title: params.title,
                    difficulty: params.difficulty,
                    pdfId,
                    mcqs: {
                        create: params.questions.map((q: any) => ({
                            question: q.question,
                            options: q.options,
                            correctIdx: q.correctIndex,
                            explanation: q.explanation || null,
                            hint: q.hint || null,
                        })),
                    },
                },
                include: { mcqs: true },
            });

            return {
                success: true,
                objectiveId: objective.id,
                questionsCount: objective.mcqs.length,
                message: `Saved objective "${params.title}" with ${objective.mcqs.length} questions`,
            };
        },
    });
}

/**
 * Tool for getting PDF information from GCS
 */
export function createGetPdfInfoTool(pdfFilename: string, gcsPath: string, gcsService: GcsService, pdfTextService?: any) {
    return new FunctionTool({
        name: "get_pdf_info",
        description: "Gets information about the PDF file to generate flashcards from. This returns the cleaned and structured text content of the PDF.",
        execute: async () => {
            try {
                // Download file from GCS
                const buffer = await gcsService.downloadFile(gcsPath);

                // If we have the new PDF text service, use it for better extraction
                if (pdfTextService) {
                    const extracted = await pdfTextService.extractText(buffer);

                    // Limit content length if too large
                    // Use structured text which is cleaner than raw text
                    const content = extracted.structuredText.substring(0, 100000);

                    return {
                        filename: pdfFilename,
                        gcsPath,
                        content,
                        pageCount: extracted.pageCount,
                        info: extracted.metadata,
                        note: "This is cleaned and structured text from the PDF, optimized for AI processing.",
                    };
                } else {
                    // Fallback to old method
                    const data = await pdfParse(buffer);
                    const content = data.text.substring(0, 100000);

                    return {
                        filename: pdfFilename,
                        gcsPath,
                        content,
                        pageCount: data.numpages,
                        info: data.info,
                    };
                }
            } catch (error) {
                console.error("Error processing PDF:", error);
                return {
                    filename: pdfFilename,
                    error: "Failed to extract PDF content. Please use the filename to infer the topic.",
                };
            }
        },
    });
}

/**
 * Tool for confirming completion
 */
export function createCompletionTool() {
    const parametersSchema = z.object({
        totalObjectives: z.number().describe("Total number of objectives created"),
        totalQuestions: z.number().describe("Total number of questions created"),
        summary: z.string().describe("A brief summary of what was generated"),
    });

    return new FunctionTool({
        name: "complete_generation",
        description: "Call this when you have finished generating and saving all flashcards",
        parameters: parametersSchema,
        execute: async (params) => {
            return {
                success: true,
                message: "Flashcard generation completed successfully",
                totalObjectives: params.totalObjectives,
                totalQuestions: params.totalQuestions,
                summary: params.summary,
            };
        },
    });
}
