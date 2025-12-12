import { LlmAgent } from "@google/adk";
import { CONTENT_ANALYZER_INSTRUCTION, QUESTION_GENERATOR_INSTRUCTION, QUALITY_ANALYZER_INSTRUCTION } from "./prompts";

// Model constants
const GEMINI_CONTENT_ANALYZER_MODEL = "gemini-2.5-flash";
const GEMINI_QUESTION_GENERATOR_MODEL = "gemini-2.5-flash";
const GEMINI_QUALITY_ANALYZER_MODEL = "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"; // For picture card generation

/**
 * Creates a content analyzer sub-agent
 * This agent analyzes PDF content and identifies learning objectives
 */
export function createContentAnalyzerAgent() {
    return new LlmAgent({
        name: "content_analyzer",
        description: "Analyzes PDF content to identify key learning objectives and concepts",
        model: GEMINI_CONTENT_ANALYZER_MODEL,
        instruction: CONTENT_ANALYZER_INSTRUCTION,
    });
}

/**
 * Creates a question generator sub-agent
 * This agent generates high-quality multiple choice questions
 */
export function createQuestionGeneratorAgent() {
    return new LlmAgent({
        name: "question_generator",
        description: "Generates high-quality multiple choice questions for educational purposes",
        model: GEMINI_QUESTION_GENERATOR_MODEL,
        instruction: QUESTION_GENERATOR_INSTRUCTION,
    });
}

/**
 * Creates a quality analyzer sub-agent
 * This agent reviews generated flashcards and provides a quality report
 */
export function createQualityAnalyzerAgent() {
    return new LlmAgent({
        name: "quality_analyzer",
        description: "Reviews generated flashcards and provides a comprehensive quality report",
        model: GEMINI_QUALITY_ANALYZER_MODEL,
        instruction: QUALITY_ANALYZER_INSTRUCTION,
    });
}

/**
 * Creates an image generator sub-agent
 * This agent generates educational images for picture cards using Imagen 3
 */
export function createImageGeneratorAgent() {
    return new LlmAgent({
        name: "image_generator",
        description: "Generates educational images for picture cards using Imagen 3",
        model: GEMINI_IMAGE_MODEL,
        instruction: `You are an image generation specialist. Generate clear, educational images based on prompts for flashcard questions.`,
    });
}
