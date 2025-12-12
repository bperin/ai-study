import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class PdfsService {
    private genAI: GoogleGenerativeAI;
    private storage: Storage;
    private bucketName: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        // Initialize Gemini
        const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY is not set');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);

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
        const [fileBuffer] = await file.download();

        // TODO: Extract text from PDF using pdf-parse
        // For now, using placeholder text
        const pdfText = `Sample PDF content from ${pdf.filename}. This would be the extracted text from the PDF.`;

        // 3. Generate flashcards using Gemini 2.5 Flash
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
You are an expert educator creating study flashcards from educational content.

USER REQUEST: ${userPrompt}

PDF CONTENT:
${pdfText}

Based on the user's request and the PDF content, generate multiple-choice questions in the following JSON format:

{
  "objectives": [
    {
      "title": "Learning objective title",
      "difficulty": "easy|medium|hard",
      "questions": [
        {
          "question": "The question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Why this answer is correct",
          "hint": "A helpful hint (optional)"
        }
      ]
    }
  ]
}

IMPORTANT:
- Parse the user's request to determine number of questions and difficulty
- Create engaging, educational questions
- Ensure options are plausible but only one is correct
- Provide clear explanations
- Group questions by learning objectives
- Return ONLY valid JSON, no markdown formatting
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parse the JSON response
        let flashcardsData;
        try {
            // Remove markdown code blocks if present
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            flashcardsData = JSON.parse(cleanedText);
        } catch (error) {
            console.error('Failed to parse Gemini response:', text);
            throw new Error('Failed to parse AI response. Please try again.');
        }

        // 4. Save to database
        const objectives = [];
        for (const obj of flashcardsData.objectives) {
            const objective = await this.prisma.objective.create({
                data: {
                    title: obj.title,
                    difficulty: obj.difficulty,
                    pdfId: pdfId,
                    mcqs: {
                        create: obj.questions.map((q: any) => ({
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
            objectives.push(objective);
        }

        return {
            message: 'Flashcards generated successfully',
            objectivesCount: objectives.length,
            questionsCount: objectives.reduce((sum, obj) => sum + obj.mcqs.length, 0),
            objectives: objectives,
        };
    }
}
