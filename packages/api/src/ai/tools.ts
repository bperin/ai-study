import { FunctionTool } from '@google/adk';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';
import * as pdfParse from 'pdf-parse';
import { GcsService } from '../pdfs/gcs.service';
import { RetrieveService } from '../rag/services/retrieve.service';

/**
 * Tool for saving a single objective with its questions to the database
 */
export function createSaveObjectiveTool(prisma: PrismaService, pdfId: string) {
  const parametersSchema = z.object({
    title: z.string().describe('The title of the learning objective'),
    difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level'),
    questions: z
      .array(
        z.object({
          question: z.string().describe('The question text'),
          options: z.array(z.string()).length(4).describe('Four answer options'),
          correctIndex: z.number().min(0).max(3).describe('Index of the correct answer (0-3)'),
          explanation: z.string().optional().describe('Explanation of the correct answer'),
          hint: z.string().optional().describe('A helpful hint for the question'),
        }),
      )
      .describe('Array of multiple choice questions for this objective'),
  });

  return new FunctionTool({
    name: 'save_objective',
    description: 'Saves a learning objective with its multiple choice questions to the database',
    parameters: parametersSchema,
    execute: async (params) => {
      console.log(`[AI Tool] save_objective called for: ${params.title} with ${params.questions.length} questions`);
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

      console.log(`[AI Tool] Successfully saved objective ${objective.id} with ${objective.mcqs.length} questions`);
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
    name: 'get_pdf_info',
    description: 'Gets information about the PDF file to generate flashcards from. This returns the cleaned and structured text content of the PDF.',
    execute: async () => {
      console.log(`[AI Tool] get_pdf_info called for: ${pdfFilename}`);
      console.log(`[AI Tool] GCS path: ${gcsPath}`);
      console.log(`[AI Tool] Has pdfTextService: ${!!pdfTextService}`);

      try {
        console.log(`[AI Tool] Downloading file from GCS...`);
        // Download file from GCS
        const buffer = await gcsService.downloadFile(gcsPath);
        console.log(`[AI Tool] Downloaded buffer size: ${buffer.length} bytes`);

        // If we have the new PDF text service, use it for better extraction
        if (pdfTextService) {
          console.log(`[AI Tool] Using new PDF text service for extraction...`);
          const extracted = await pdfTextService.extractText(buffer);
          console.log(`[AI Tool] Extracted text length: ${extracted.structuredText.length} chars, pages: ${extracted.pageCount}`);

          // Limit content length if too large
          // Use structured text which is cleaner than raw text
          const content = extracted.structuredText.substring(0, 2000000);
          console.log(`[AI Tool] Returning content with ${content.length} characters`);

          return {
            filename: pdfFilename,
            gcsPath,
            content,
            pageCount: extracted.pageCount,
            info: extracted.metadata,
            note: 'This is cleaned and structured text from the PDF, optimized for AI processing.',
          };
        } else {
          console.log(`[AI Tool] Using fallback PDF parsing method...`);
          // Fallback to old method
          const data = await pdfParse(buffer);
          const content = data.text.substring(0, 2000000);
          console.log(`[AI Tool] Fallback extracted text length: ${content.length} chars, pages: ${data.numpages}`);

          return {
            filename: pdfFilename,
            gcsPath,
            content,
            pageCount: data.numpages,
            info: data.info,
          };
        }
      } catch (error) {
        console.error(`[AI Tool] Error processing PDF ${pdfFilename}:`, error);
        return {
          filename: pdfFilename,
          error: 'Failed to extract PDF content. Please use the filename to infer the topic.',
        };
      }
    },
  });
}

/**
 * Tool for semantic search within the document
 */
export function createDocumentSearchTool(retrieveService: RetrieveService, pdfFilename: string, gcsPath: string) {
  const parametersSchema = z.object({
    query: z.string().describe('The search query to find relevant parts of the document'),
  });

  return new FunctionTool({
    name: 'search_document',
    description: 'Semantically searches the current document for relevant information based on a natural language query.',
    parameters: parametersSchema,
    execute: async ({ query }) => {
      console.log(`[AI Tool] search_document called with query: ${query}`);
      try {
        // Find document chunks for this file
        // We'll use a hacky but effective way to find the documentId by scanning Chunks for the gcsPath or filename
        // A better way would be passing documentId directly if we had it in the agent context
        const chunks = await (retrieveService as any).prisma.chunk.findMany({
          where: {
            document: {
              OR: [{ sourceUri: { contains: gcsPath } }, { title: { equals: pdfFilename, mode: 'insensitive' } }],
            },
          },
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            documentId: true,
            chunkIndex: true,
            content: true,
          },
        });

        if (chunks.length === 0) {
          return { error: 'Document not indexed for search yet.' };
        }

        const ranked = await retrieveService.rankChunks(query, chunks, 5);
        const context = ranked.map((chunk) => `[Relevance: ${Math.round(chunk.score * 100)}%] Content: ${chunk.content.trim()}`).join('\n\n---\n\n');

        return {
          results: context,
          count: ranked.length,
          message: `Found ${ranked.length} relevant sections in the document.`,
        };
      } catch (error: any) {
        console.error(`[AI Tool] Error searching document:`, error);
        return { error: `Failed to search document: ${error.message}` };
      }
    },
  });
}

/**
 * Tool for fetching content from a URL (Web Search / Link)
 */
export function createWebSearchTool() {
  return new FunctionTool({
    name: 'fetch_url_content',
    description: 'Fetches the text content from a given URL to use as context for generating questions.',
    parameters: z.object({
      url: z.string().describe('The URL to fetch content from'),
    }),
    execute: async ({ url }) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);
        const html = await response.text();
        // Simple regex to strip HTML tags (basic implementation)
        const text = html.replace(/<[^>]*>?/gm, ' ').substring(0, 100000);
        return {
          url,
          content: text,
          message: 'Content fetched successfully.',
        };
      } catch (error) {
        return {
          url,
          error: `Failed to fetch URL: ${error}`,
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
    totalObjectives: z.number().describe('Total number of objectives created'),
    totalQuestions: z.number().describe('Total number of questions created'),
    summary: z.string().describe('A brief summary of what was generated'),
  });

  return new FunctionTool({
    name: 'complete_generation',
    description: 'Call this when you have finished generating and saving all flashcards',
    parameters: parametersSchema,
    execute: async (params) => {
      return {
        success: true,
        message: 'Flashcard generation completed successfully',
        totalObjectives: params.totalObjectives,
        totalQuestions: params.totalQuestions,
        summary: params.summary,
      };
    },
  });
}
