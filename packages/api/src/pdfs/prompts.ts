/**
 * Prompts for Gemini AI models
 */

export const FLASHCARD_GENERATION_PROMPT = (userRequest: string, pdfContent: string) => `
You are an expert educator creating study flashcards from educational content.

USER REQUEST: ${userRequest}

PDF CONTENT:
${pdfContent}

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
- Create engaging, educational questions that test understanding, not just memorization
- Ensure all options are plausible but only one is correct
- Provide clear, concise explanations
- Group questions by learning objectives or topics
- Include hints when requested by the user
- Return ONLY valid JSON, no markdown formatting or code blocks
- If the user specifies a number of questions, distribute them across objectives
`;

/**
 * Future: Image generation prompt for visual learning aids
 * Model: gemini-2.5-flash-light-image
 */
export const IMAGE_GENERATION_PROMPT = (concept: string) => `
Create a simple, educational diagram or illustration for the following concept:
${concept}

The image should be clear, minimalist, and help students understand the concept visually.
`;
