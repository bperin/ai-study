import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const LearningIntentAnalysisSchema = z.object({
  summary: z.string(),
  keyThemes: z.array(z.string()),
  suggestedIntents: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      keyTopics: z.array(z.string()),
      rationale: z.string(),
    })
  ),
});

export const LearningIntentSchema = z.object({
  intents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      keyTopics: z.array(z.string()),
      questionCount: z.number(),
    })
  ),
  totalIntents: z.number(),
  totalQuestions: z.number(),
  coverageNotes: z.string(),
});

export const QuestionArtifactSchema = z.object({
  intentTitle: z.string(),
  intentDescription: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
      hint: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      grounding: z.string(),
    })
  ),
});

export const QuestionArtifactEvalSchema = z.object({
  approved: z.boolean(),
  overallScore: z.number(),
  summary: z.string(),
  issues: z.array(z.string()),
  questionFeedback: z.array(
    z.object({
      question: z.string(),
      status: z.enum(['approved', 'needs_revision', 'rejected']),
      notes: z.string(),
    })
  ),
});

export const IntentQuestionsSchema = z.object({
  intentTitle: z.string(),
  intentDescription: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
      hint: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })
  ),
});

export const LearningIntentAnalysisJsonSchema = zodToJsonSchema(LearningIntentAnalysisSchema);
export const LearningIntentJsonSchema = zodToJsonSchema(LearningIntentSchema);
export const QuestionArtifactJsonSchema = zodToJsonSchema(QuestionArtifactSchema);
export const QuestionArtifactEvalJsonSchema = zodToJsonSchema(QuestionArtifactEvalSchema);
export const IntentQuestionsJsonSchema = zodToJsonSchema(IntentQuestionsSchema);
