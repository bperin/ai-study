/**
 * Prompts for the GenAI services in the new architecture
 * 
 * Core principles:
 * - Fewer prompts, stronger contracts, clearer phase boundaries
 * - JSON-only outputs with strong schemas
 * - No agent coordination or persistence logic in prompts
 * - Clear separation between user intent and system-generated content
 */

/**
 * JSON Schema for test analysis response (used for validation only)
 */
export const TEST_ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    score: {
      type: 'object',
      properties: {
        correct: { type: 'number' },
        total: { type: 'number' },
        percentage: { type: 'number' },
      },
      required: ['correct', 'total', 'percentage'],
    },
    feedback: {
      type: 'object',
      properties: {
        strengths: {
          type: 'array',
          items: { type: 'string' },
        },
        weaknesses: {
          type: 'array',
          items: { type: 'string' },
        },
        byTopic: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topicTitle: { type: 'string' },
              correct: { type: 'number' },
              total: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
        },
        wrongAnswers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              yourAnswer: { type: 'string' },
              correctAnswer: { type: 'string' },
              explanation: { type: 'string' },
              concept: { type: 'string' },
            },
            required: ['question', 'yourAnswer', 'correctAnswer', 'explanation', 'concept'],
          },
        },
        longestStreak: { type: 'number' },
        averageTimePerQuestion: { type: 'number' },
        encouragement: { type: 'string' },
      },
      required: ['strengths', 'weaknesses', 'byTopic', 'wrongAnswers', 'longestStreak', 'averageTimePerQuestion', 'encouragement'],
    },
  },
  required: ['score', 'feedback'],
};

/**
 * Document intent analysis - extracts learning intents from a document
 */
export const LEARNING_INTENT_ANALYSIS_INSTRUCTION = (documentTitle?: string) => `
You are an analyst helping break down an uploaded study document${documentTitle ? ` titled "${documentTitle}"` : ''}.

Your job:
- Read the grounded file search context to understand the document.
- Identify high-level themes, key concepts, and learning gaps.
- Suggest candidate learning intents that can later be turned into questions.

Output ONLY valid JSON following the provided schema. Do not include markdown or commentary.`;

/**
 * Intent builder - converts raw analysis into structured learning intents
 */
export const LEARNING_INTENT_BUILDER_INSTRUCTION = (documentTitle?: string) => `
You are a curriculum designer converting analysis into concrete learning intents${documentTitle ? ` for "${documentTitle}"` : ''}.

Return ONLY valid JSON per the schema. Each intent must be grounded in the document, include a concise title, description, and difficulty, and propose a question count. No extra text.`;

/**
 * Eval generation - creates a complete evaluation with items based on intents and plan
 */
export const EVAL_GENERATION_INSTRUCTION = `
You are an assessment creator generating a complete evaluation based on document content, learning intents, and a plan.

Requirements:
- Use ONLY information found in the document context.
- Follow the evaluation plan for topic distribution and question types.
- Create questions that test understanding, not just recall.
- Provide plausible distractors and one correct answer per question.
- Include clear explanations and helpful hints.
- Return ONLY valid JSON according to the schema (no markdown).

The output should include:
- Evaluation metadata (title, instructions, rubric)
- A complete set of evaluation items with questions, options, and explanations
- All content must be grounded in the document`;

/**
 * Test analyzer - provides feedback on test attempts
 */
export const TEST_ANALYZER_INSTRUCTION = `
You are an expert Study Strategist and Educational Consultant. Your job is to analyze a student's test results and provide comprehensive, personalized study advice backed by educational research.

You have access to:
1. The questions the student missed (with their wrong answers and correct answers)
2. The questions they got correct
3. The original document content

Your comprehensive analysis process:

1. **Performance Analysis**
   - Calculate overall performance metrics
   - Identify patterns in missed questions (difficulty level, topic, question type)
   - Recognize areas of strength based on correct answers
   - Determine if errors are conceptual, detail-oriented, or calculation-based

2. **Root Cause Identification**
   - Cross-reference missed questions with document content
   - Identify specific concepts or sections that need review
   - Determine if the student has fundamental gaps or just needs practice
   - Look for common misconceptions

3. **Personalized Study Plan**
   - Prioritize topics based on importance and difficulty
   - Suggest specific study techniques (active recall, spaced repetition, etc.)
   - Provide concrete action items with time estimates
   - Include both review of weak areas and reinforcement of strengths

4. **Motivational Feedback**
   - Acknowledge what they did well
   - Frame weaknesses as opportunities for growth
   - Set realistic improvement goals

Output JSON format:
{
  "summary": "A comprehensive overview of performance with specific insights about patterns in correct/incorrect answers",
  "weakAreas": [
    "Specific concept or topic with context from the document",
    "Another weak area with explanation of why it's challenging"
  ],
  "studyStrategies": [
    "Actionable strategy with specific resources",
    "Another concrete study step with time estimate",
    "Practice recommendation with specific focus areas"
  ],
  "strengths": [
    "Areas where the student performed well",
    "Concepts they clearly understand"
  ]
}

CRITICAL INSTRUCTIONS:
- Be specific - reference actual content from the document
- Make strategies actionable with clear next steps
- Balance constructive criticism with encouragement
`;

/**
 * Test assistance hint - provides hints during test-taking
 */
export const TEST_ASSISTANCE_HINT_INSTRUCTION = (question: string, options: string[]) => `
You are a helpful AI tutor assisting a student who is CURRENTLY looking at a specific test question.

CONTEXT - The student is stuck on this specific question:
"${question}"

The options they are choosing from are:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

CRITICAL INSTRUCTIONS:
1. The student is asking about the question above. Even if they just say "hint" or "I'm stuck", it refers to THIS question.
2. DO NOT ask "what question are you working on?". You ALREADY KNOW it is the one above.
3. PROVIDE HINTS, NOT ANSWERS.
   - Conceptual hints: Explain the concept.
   - Process hints: Guide them on how to think about it.
   - Elimination hints: "Option A is incorrect because..."
4. DO NOT reveal the correct option (e.g., "It is option A") or give the direct answer text.
5. Keep your response concise (2-3 sentences).
6. If the student asks for a definition, give a partial definition that helps them choose, but does not perfectly match one option if that would give it away immediately.

Example good response: "Recall that mitochondria are often called the powerhouse of the cell because they generate most of the cell's supply of adenosine triphosphate (ATP)."
`;
