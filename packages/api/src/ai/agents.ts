import { LlmAgent } from '@google/adk';
import { RetrieveService } from '../rag/services/retrieve.service';
import { CONTENT_ANALYZER_INSTRUCTION, QUESTION_GENERATOR_INSTRUCTION, QUALITY_ANALYZER_INSTRUCTION, ROOT_AGENT_INSTRUCTION, TEST_ANALYZER_INSTRUCTION } from './prompts';
import { GEMINI_MODEL } from '../constants/models';
import { createDocumentSearchTool, createGetPdfInfoTool, createSaveObjectiveTool, createWebSearchTool } from './tools';

// Model constants
const GEMINI_CONTENT_ANALYZER_MODEL = GEMINI_MODEL;
const GEMINI_QUESTION_GENERATOR_MODEL = GEMINI_MODEL;
const GEMINI_QUALITY_ANALYZER_MODEL = GEMINI_MODEL;
const GEMINI_IMAGE_MODEL = GEMINI_MODEL; // For picture card generation

/**
 * Creates a content analyzer sub-agent
 * This agent analyzes PDF content and identifies learning objectives
 */
export function createContentAnalyzerAgent() {
  return new LlmAgent({
    name: 'content_analyzer',
    description: 'Analyzes PDF content to identify key learning objectives and concepts',
    model: GEMINI_CONTENT_ANALYZER_MODEL,
    instruction: CONTENT_ANALYZER_INSTRUCTION,
  });
}

/**
 * Creates a question generator sub-agent
 * This agent generates high-quality multiple choice questions
 */
export function createQuestionGeneratorAgent(pdfFilename: string, gcsPath: string, gcsService: any, pdfTextService: any, retrieveService: RetrieveService) {
  return new LlmAgent({
    name: 'question_generator',
    description: 'Generates high-quality multiple choice questions for educational purposes',
    model: GEMINI_QUESTION_GENERATOR_MODEL,
    instruction: QUESTION_GENERATOR_INSTRUCTION,
    tools: [createGetPdfInfoTool(pdfFilename, gcsPath, gcsService, pdfTextService), createDocumentSearchTool(retrieveService, pdfFilename, gcsPath), createWebSearchTool()],
  });
}

/**
 * Creates a quality analyzer sub-agent
 * This agent reviews generated flashcards and provides a quality report
 */
export function createQualityAnalyzerAgent() {
  return new LlmAgent({
    name: 'quality_analyzer',
    description: 'Reviews generated flashcards and provides a comprehensive quality report',
    model: GEMINI_QUALITY_ANALYZER_MODEL,
    instruction: QUALITY_ANALYZER_INSTRUCTION,
  });
}

export function createFlashcardOrchestratorAgent(tools: any[]) {
  return new LlmAgent({
    name: 'flashcard_orchestrator',
    description: 'Orchestrates the generation of educational flashcards from PDF content',
    model: GEMINI_MODEL,
    instruction: ROOT_AGENT_INSTRUCTION,
    tools,
  });
}

export function createQuestionGeneratorAgentByDifficulty(difficulty: 'easy' | 'medium' | 'hard', prisma: any, pdfId: string, retrieveService: RetrieveService, pdfFilename: string, gcsPath: string) {
  return new LlmAgent({
    name: `question_generator_${difficulty}`,
    description: `Generates ${difficulty} difficulty questions`,
    model: GEMINI_QUESTION_GENERATOR_MODEL,
    instruction: QUESTION_GENERATOR_INSTRUCTION,
    tools: [createSaveObjectiveTool(prisma, pdfId), createDocumentSearchTool(retrieveService, pdfFilename, gcsPath), createWebSearchTool()],
  });
}

export function createTestAnalyzerAgent(pdfFilename: string, gcsPath: string, gcsService: any, pdfTextService: any, retrieveService: RetrieveService) {
  return new LlmAgent({
    name: 'test_analyzer',
    description: 'Analyzes test results and suggests study strategies with web-enhanced resources',
    model: GEMINI_QUALITY_ANALYZER_MODEL,
    instruction: TEST_ANALYZER_INSTRUCTION,
    tools: [createGetPdfInfoTool(pdfFilename, gcsPath, gcsService, pdfTextService), createDocumentSearchTool(retrieveService, pdfFilename, gcsPath), createWebSearchTool()],
  });
}

/**
 * Creates a test plan chat agent
 * This agent helps students create test plans from PDF content
 */
export function createTestPlanChatAgent(retrieveService: RetrieveService, pdfFilename: string, gcsPath: string) {
  const { TEST_PLAN_CHAT_PROMPT } = require('./prompts');
  return new LlmAgent({
    name: 'test_plan_chat',
    description: 'Helps students create customized test plans from their study materials',
    model: GEMINI_MODEL,
    instruction: TEST_PLAN_CHAT_PROMPT(pdfFilename || 'Study Guide', ''), // Removed direct content
    tools: [createDocumentSearchTool(retrieveService, pdfFilename, gcsPath)],
  });
}

/**
 * Creates a test assistance agent
 * This agent helps students during test taking without giving away answers
 */
export function createTestAssistanceAgent(question: string, options: string[], retrieveService: RetrieveService, pdfFilename: string, gcsPath: string) {
  const { TEST_ASSISTANCE_CHAT_PROMPT } = require('./prompts');
  return new LlmAgent({
    name: 'test_assistant',
    description: 'Provides helpful hints and explanations during test taking without revealing answers',
    model: GEMINI_MODEL,
    // The instruction now receives placeholders or a base prompt that doesn't strictly depend on pdfContent
    // since the tool is the primary source of knowledge.
    // However, to fix the user issue, we must ensure the QUESTION is part of the system instruction.
    instruction: TEST_ASSISTANCE_CHAT_PROMPT(question, options, ''),
    tools: [createDocumentSearchTool(retrieveService, pdfFilename, gcsPath)],
  });
}

/**
 * Creates an image generator sub-agent
 * This agent generates educational images for picture cards using Imagen 3
 */
export function createImageGeneratorAgent() {
  return new LlmAgent({
    name: 'image_generator',
    description: 'Generates educational images for picture cards using Imagen 3',
    model: GEMINI_IMAGE_MODEL,
    instruction: `You are an image generation specialist. Generate clear, educational images based on prompts for flashcard questions.`,
  });
}
