import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Storage } from '@google-cloud/storage';
import { LlmAgent, Gemini } from '@google/adk';
import { z } from 'zod';
import { FLASHCARD_GENERATION_PROMPT } from './prompts';

// Define schemas for structured output
const QuestionSchema = z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correctIndex: z.number().min(0).max(3),
    explanation: z.string().optional(),
    hint: z.string().optional(),
});

const ObjectiveSchema = z.object({
    title: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    questions: z.array(QuestionSchema),
});

const FlashcardsOutputSchema = z.object({
    objectives: z.array(ObjectiveSchema),
});

@Injectable()
export class PdfsService {
    private storage: Storage;
    private bucketName: string;
    private flashcardAgent: LlmAgent;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        // Initialize GCS
        const projectId = this.configService.get<string>('GCP_PROJECT_ID');
        const clientEmail = this.configService.get<string>('GCP_CLIENT_EMAIL');
        const privateKey = this.configService.get<string>('GCP_PRIVATE_KEY')?.replace(/\\n/g, '\n');

        this.storage = new Storage({
            projectId,
            credentials: clientEmail && privateKey ? {
                client_email: clientEmail,
                private_key: privateKey,
            } : undefined,
        });

        this.bucketName = this.configService.get<string>('GCP_BUCKET_NAME') ?? 'missing-bucket';

        // Initialize ADK Agent for flashcard generation
        const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY is not set');
        }

        // Create Gemini 2.5 Flash model
        const model = new Gemini({
            model: 'gemini-2.5-flash',
            apiKey,
        });

        // Create LLM Agent
        this.flashcardAgent = new LlmAgent({
            name: 'flashcard-generator',
            description: 'Generates educational flashcards from PDF content',
            model,
        });
    }

    async generateFlashcards(pdfId: string, userId: string, userPrompt: string) {
        // 1. Get PDF from database
        const pdf = await this.prisma.pdf.findFirst({
            where: {
                id: pdfId,
                userId: userId,
            },
        });

        if (!pdf) {
            throw new NotFoundException('PDF not found');
        }

        // 2. Download PDF content from GCS
        const filePath = pdf.content; // This is the GCS path
        const file = this.storage.bucket(this.bucketName).file(filePath);
        await file.download(); // Download for future PDF parsing

        // TODO: Extract text from PDF using pdf-parse
        // For now, using placeholder text
        const pdfText = `Sample PDF content from ${pdf.filename}. This would be the extracted text from the PDF.`;

        // 3. Generate flashcards using ADK Agent
        const prompt = FLASHCARD_GENERATION_PROMPT(userPrompt, pdfText);

        // Invoke the agent directly
        const events: any[] = [];
        for await (const event of this.flashcardAgent.invokeAsync({
            prompt,
        })) {
            events.push(event);
        }

        // Get the last response
        const lastEvent = events[events.length - 1];
        const responseText = lastEvent.content?.[0]?.text || '{}';

        // Parse JSON response
        let flashcardsData: z.infer<typeof FlashcardsOutputSchema>;
        try {
            flashcardsData = JSON.parse(responseText);
        } catch (error) {
            console.error('Failed to parse response:', responseText);
            throw new Error('Failed to parse AI response. Please try again.');
        }

        // 4. Save to database (in parallel for better performance)
        const objectivePromises = flashcardsData.objectives.map(async (obj) => {
            return this.prisma.objective.create({
                data: {
                    title: obj.title,
                    difficulty: obj.difficulty,
                    pdfId: pdfId,
                    mcqs: {
                        create: obj.questions.map((q) => ({
                            question: q.question,
                            options: q.options,
                            correctIdx: q.correctIndex,
                            explanation: q.explanation || null,
                            hint: q.hint || null,
                        })),
                    },
                },
                include: {
                    mcqs: true,
                },
            });
        });

        // Execute all database saves in parallel
        const objectives = await Promise.all(objectivePromises);

        return {
            message: 'Flashcards generated successfully',
            objectivesCount: objectives.length,
            questionsCount: objectives.reduce((sum, obj) => sum + obj.mcqs.length, 0),
            objectives: objectives,
        };
    }
}
