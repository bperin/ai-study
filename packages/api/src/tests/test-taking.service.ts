import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RetrieveService } from '../rag/services/retrieve.service';
import { createAdkRunner, isAdkAvailable } from '../ai/adk.helpers';
import { createTestAssistanceAgent } from '../ai/agents';
import { PdfTextService } from '../pdfs/pdf-text.service';
import { GcsService } from '../pdfs/gcs.service';
import { GEMINI_MODEL } from '../constants/models';
import { TestsRepository } from './tests.repository';
import { CreateTestAttemptRecordDto } from './dto/create-test-attempt-record.dto';
import { CreateUserAnswerRecordDto } from './dto/create-user-answer-record.dto';
import { UpdateUserAnswerRecordDto } from './dto/update-user-answer-record.dto';
import { UpdateTestAttemptRecordDto } from './dto/update-test-attempt-record.dto';

/**
 * In-memory state for active test sessions
 */
export interface TestSessionState {
  attemptId: string;
  userId: string;
  currentQuestionIndex: number;
  totalQuestions: number;

  // Answer tracking
  answers: {
    questionId: string;
    questionNumber: number;
    questionText: string;
    selectedAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
    hintsUsed: number;
  }[];

  // Real-time performance metrics
  correctCount: number;
  incorrectCount: number;
  currentStreak: number;
  longestStreak: number;

  // Topic performance (live tracking)
  topicScores: Map<
    string,
    {
      correct: number;
      total: number;
      objectiveTitle: string;
    }
  >;

  // Timing
  startTime: Date;
  totalTimeSpent: number; // seconds

  // Engagement
  totalHintsUsed: number;
  questionsSkipped: number;
}

/**
 * Test Taking Agent - manages the interactive test experience
 */
@Injectable()
export class TestTakingService {
  constructor(
    private readonly configService: ConfigService,
    private readonly testsRepository: TestsRepository,
    private readonly retrieveService: RetrieveService,
    private readonly pdfTextService: PdfTextService,
    private readonly gcsService: GcsService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (apiKey) {
      process.env.GOOGLE_GENAI_API_KEY = apiKey;
    }
  }

  /**
   * Initialize or Resume a test session
   */
  async getOrStartSession(userId: string, pdfId: string): Promise<TestSessionState> {
    // Check for existing incomplete attempt
    let attempt = await this.testsRepository.findActiveAttempt(userId, pdfId);

    if (!attempt) {
      // Create new attempt
      const totalQuestions = await this.testsRepository.countMcqsByPdfId(pdfId);
      const createAttemptDto = new CreateTestAttemptRecordDto();
      createAttemptDto.userId = userId;
      createAttemptDto.pdfId = pdfId;
      createAttemptDto.total = totalQuestions;
      createAttemptDto.score = 0;
      const newAttempt = await this.testsRepository.createAttempt(createAttemptDto);
      return this.rehydrateState(newAttempt);
    }

    return this.rehydrateState(attempt);
  }

  /**
   * Get current session state (rehydrated)
   */
  async getSessionState(attemptId: string): Promise<TestSessionState> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);

    if (!attempt) throw new Error('Attempt not found');
    return this.rehydrateState(attempt);
  }

  /**
   * Rehydrate state from DB attempt
   */
  private async rehydrateState(attempt: any): Promise<TestSessionState> {
    const questions = await this.testsRepository.findMcqsByPdfId(attempt.pdfId);
    // @ts-ignore
    const answers = attempt.answers || [];

    // Calculate metrics from existing answers
    let correctCount = 0;
    let incorrectCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let totalTimeSpent = 0;
    const topicScores = new Map<string, { correct: number; total: number; objectiveTitle: string }>();

    const processedAnswers = answers.map((a: any, index: number) => {
      const isCorrect = a.isCorrect;
      if (isCorrect) {
        correctCount++;
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        incorrectCount++;
        currentStreak = 0;
      }
      totalTimeSpent += a.timeSpent;

      // Topic scores
      // Note: If answers come from createAttempt without full relation loaded, a.mcq might be missing or incomplete.
      // However, rehydrateState is mostly called with attempts fetched with includes.
      // createAttempt returns answers: UserAnswer[] which don't have mcq relation.
      // So if this is a fresh attempt with no answers, this loop is empty.
      // If it has answers, they must have mcq relation loaded.
      if (a.mcq) {
        const topicId = a.mcq.objectiveId;
        const currentScore = topicScores.get(topicId) || { correct: 0, total: 0, objectiveTitle: a.mcq.objective.title };
        currentScore.total++;
        if (isCorrect) currentScore.correct++;
        topicScores.set(topicId, currentScore);
      }

      return {
        questionId: a.mcqId,
        questionNumber: index + 1,
        questionText: a.mcq?.question || '',
        selectedAnswer: a.selectedIdx,
        correctAnswer: a.mcq?.correctIdx || 0,
        isCorrect,
        timeSpent: a.timeSpent,
        hintsUsed: a.hintsUsed,
      };
    });

    // @ts-ignore
    return {
      attemptId: attempt.id,
      userId: attempt.userId,
      currentQuestionIndex: processedAnswers.length,
      totalQuestions: questions.length, // Or attempt.total if fixed
      answers: processedAnswers,
      correctCount,
      incorrectCount,
      currentStreak,
      longestStreak,
      topicScores,
      startTime: attempt.startedAt,
      totalTimeSpent,
      totalHintsUsed: 0, // Need to track this in DB if we want to restore it
      questionsSkipped: 0,
    };
  }

  /**
   * Record an answer and update state
   */
  /**
   * Get AI assistance for a specific question
   */
  async getQuestionAssistance(attemptId: string, questionId: string): Promise<string> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);

    if (!attempt) throw new NotFoundException('Attempt not found');

    const question = await this.testsRepository.findMcqById(questionId);

    if (!question) throw new NotFoundException('Question not found');

    // Extract PDF text for context
    let pdfContent = '';
    if (attempt.pdf.gcsPath) {
      try {
        const buffer = await this.gcsService.downloadFile(attempt.pdf.gcsPath);
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContent = extracted.structuredText.substring(0, 50000);
      } catch (e) {
        console.error(`[TestTakingService] Failed to extract PDF text:`, e);
      }
    }

    if (!isAdkAvailable()) {
      return 'AI assistance is currently unavailable.';
    }

    const agent = createTestAssistanceAgent(question.question, question.options, this.retrieveService, attempt.pdf.filename, attempt.pdf.gcsPath || '');

    const runner = createAdkRunner({ agent, appName: 'test-assistant' });
    if (!runner) return 'Failed to initialize AI assistant.';

    const result = await runner.run({
      agent,
      prompt: 'I need a hint for this question. Please help me understand the concept without giving away the answer.',
    });
    return result.text;
  }

  async recordAnswer(attemptId: string, questionId: string, selectedAnswer: number, timeSpent: number): Promise<any> {
    // Load attempt from DB
    const attempt = await this.testsRepository.findAttemptById(attemptId);

    if (!attempt) throw new Error('Attempt not found');

    const state = await this.rehydrateState(attempt);

    // Get question details
    const question = await this.testsRepository.findMcqById(questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = selectedAnswer === question.correctIdx;

    // Update in-memory state simulation for immediate feedback
    // (This part is just to calculate the *next* state for the return value)
    state.answers.push({
      questionId,
      questionNumber: state.currentQuestionIndex + 1,
      questionText: question.question,
      selectedAnswer,
      correctAnswer: question.correctIdx,
      isCorrect,
      timeSpent,
      hintsUsed: 0,
    });

    if (isCorrect) {
      state.correctCount++;
      state.currentStreak++;
    } else {
      state.incorrectCount++;
      state.currentStreak = 0;
    }

    state.currentQuestionIndex++;

    // Persist to database
    // Check if answer already exists - if so, update it (allow retries)
    const existingAnswer = await this.testsRepository.findUserAnswer(attemptId, questionId);

    if (existingAnswer) {
      // Update existing answer - latest attempt counts
      const updateDto = new UpdateUserAnswerRecordDto();
      updateDto.selectedIdx = selectedAnswer;
      updateDto.isCorrect = isCorrect;
      updateDto.timeSpent = existingAnswer.timeSpent + timeSpent;
      await this.testsRepository.updateUserAnswer(existingAnswer.id, updateDto);
    } else {
      // Create new answer
      const createAnswerDto = new CreateUserAnswerRecordDto();
      createAnswerDto.attemptId = attemptId;
      createAnswerDto.mcqId = questionId;
      createAnswerDto.selectedIdx = selectedAnswer;
      createAnswerDto.isCorrect = isCorrect;
      createAnswerDto.timeSpent = timeSpent;
      await this.testsRepository.createUserAnswer(createAnswerDto);
    }

    // Generate encouragement
    const encouragement = this.generateEncouragement(state);

    return {
      isCorrect,
      currentScore: `${state.correctCount}/${state.answers.length}`,
      currentStreak: state.currentStreak,
      progress: `${state.currentQuestionIndex}/${state.totalQuestions}`,
      encouragement,
      explanation: question.explanation,
    };
  }

  /**
   * Generate dynamic encouragement using bracket notation
   */
  private generateEncouragement(state: TestSessionState): string {
    let template: string;

    if (state.currentStreak >= 5) {
      template = '🔥 On fire! [CURRENT_STREAK] correct in a row! [PROGRESS]';
    } else if (state.answers.length > 0 && state.correctCount / state.answers.length > 0.8) {
      template = "⭐ Excellent work! [CURRENT_SCORE] - you're mastering this!";
    } else if (state.answers.length > 0 && state.answers[state.answers.length - 1].isCorrect) {
      template = '✅ Correct! [CURRENT_SCORE]. [PROGRESS]';
    } else if (state.incorrectCount > state.correctCount && state.answers.length > 0) {
      template = 'Keep going! Learning from mistakes is progress. [PROGRESS]';
    } else {
      template = 'Nice! [CURRENT_SCORE]. [PROGRESS]';
    }

    return this.substituteBrackets(template, state);
  }

  /**
   * Substitute bracket notation with actual values
   */
  private substituteBrackets(template: string, state: TestSessionState): string {
    const weakTopics = Array.from(state.topicScores.entries())
      .filter(([_, score]) => score.total > 0 && score.correct / score.total < 0.6)
      .map(([_, score]) => score.objectiveTitle)
      .join(', ');

    const strongTopics = Array.from(state.topicScores.entries())
      .filter(([_, score]) => score.total > 0 && score.correct / score.total >= 0.8)
      .map(([_, score]) => score.objectiveTitle)
      .join(', ');

    const currentTopic =
      state.answers.length > 0
        ? (() => {
            // Find topic from topicScores
            for (const [_, score] of state.topicScores.entries()) {
              return score.objectiveTitle;
            }
            return '';
          })()
        : '';

    const replacements: Record<string, string> = {
      '[CURRENT_SCORE]': `${state.correctCount}/${state.answers.length}`,
      '[CORRECT_COUNT]': state.correctCount.toString(),
      '[INCORRECT_COUNT]': state.incorrectCount.toString(),
      '[CURRENT_STREAK]': state.currentStreak.toString(),
      '[PROGRESS]': `Question ${state.currentQuestionIndex}/${state.totalQuestions}`,
      '[TIME_ELAPSED]': `${Math.floor(state.totalTimeSpent / 60)} minutes`,
      '[LAST_ANSWER]': state.answers.length > 0 ? (state.answers[state.answers.length - 1].isCorrect ? 'correct' : 'incorrect') : '',
      '[WEAK_TOPICS]': weakTopics || 'None yet',
      '[STRONG_TOPICS]': strongTopics || 'Building...',
      '[HINTS_USED]': state.totalHintsUsed.toString(),
      '[CURRENT_TOPIC]': currentTopic,
    };

    let result = template;
    for (const [bracket, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(bracket.replace(/[[\]]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  /**
   * Complete test and generate feedback
   */
  async completeTest(attemptId: string): Promise<any> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);

    if (!attempt) throw new Error('Attempt not found');
    const state = await this.rehydrateState(attempt);

    const percentage = (state.correctCount / state.totalQuestions) * 100;

    // Generate detailed feedback
    const feedback = await this.generateDetailedFeedback(state);

    // Update test attempt in database
    const updateDto = new UpdateTestAttemptRecordDto();
    updateDto.score = state.correctCount;
    updateDto.total = state.totalQuestions;
    updateDto.completedAt = new Date();
    updateDto.feedback = feedback as any;
    updateDto.summary = feedback.aiSummary;
    await this.testsRepository.updateAttempt(attemptId, updateDto);

    return {
      score: {
        correct: state.correctCount,
        total: state.totalQuestions,
        percentage,
      },
      feedback,
    };
  }

  /**
   * Generate detailed AI-powered feedback
   */
  private async generateDetailedFeedback(state: TestSessionState): Promise<any> {
    // Analyze performance by topic
    const byObjective = Array.from(state.topicScores.entries()).map(([_, score]) => ({
      objectiveTitle: score.objectiveTitle,
      correct: score.correct,
      total: score.total,
      percentage: (score.correct / score.total) * 100,
    }));

    // Identify strengths and weaknesses
    const strengths = byObjective.filter((obj) => obj.percentage >= 80).map((obj) => obj.objectiveTitle);

    const weaknesses = byObjective.filter((obj) => obj.percentage < 60).map((obj) => obj.objectiveTitle);

    // Get wrong answers with details
    const wrongAnswers = state.answers
      .filter((a) => !a.isCorrect)
      .map((a) => ({
        question: a.questionText,
        yourAnswer: `Option ${a.selectedAnswer + 1}`,
        correctAnswer: `Option ${a.correctAnswer + 1}`,
      }));

    // Generate AI summary report
    const aiSummary = await this.generateAISummaryReport(state, byObjective, strengths, weaknesses);

    return {
      strengths,
      weaknesses,
      byObjective,
      wrongAnswers,
      longestStreak: state.longestStreak,
      averageTimePerQuestion: Math.round(state.totalTimeSpent / state.totalQuestions),
      encouragement: this.generateFinalEncouragement(state),
      aiSummary, // Add AI-generated summary report
    };
  }

  /**
   * Generate AI-powered summary report with web search and resource links
   */
  // @ts-ignore
  private async generateAISummaryReport(state: TestSessionState, byObjective: any[], strengths: string[], weaknesses: string[]): Promise<string> {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        tools: [
          {
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: 'MODE_DYNAMIC',
                dynamicThreshold: 0.7,
              },
            },
          },
        ],
      });

      const percentage = (state.correctCount / state.totalQuestions) * 100;

      const prompt = `Generate a personalized test summary report for a student who just completed a flashcard test. Use web search to find relevant study resources and include specific links.

Test Results:
- Score: ${state.correctCount}/${state.totalQuestions} (${percentage.toFixed(1)}%)
- Longest streak: ${state.longestStreak} correct answers in a row
- Average time per question: ${Math.round(state.totalTimeSpent / state.totalQuestions)} seconds
- Total time: ${Math.round(state.totalTimeSpent / 60)} minutes

Performance by Topic:
${byObjective.map((obj) => `- ${obj.objectiveTitle}: ${obj.correct}/${obj.total} (${obj.percentage.toFixed(1)}%)`).join('\n')}

Strong Areas: ${strengths.length > 0 ? strengths.join(', ') : 'Building foundation'}
Areas for Improvement: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'Great performance across all topics'}

Generate a comprehensive summary that includes:

1. **Performance Analysis** (1-2 paragraphs):
   - Acknowledge their performance with specific insights
   - Highlight strongest areas and learning patterns
   - Identify areas needing improvement

2. **Study Recommendations** with web-sourced links:
   - For each weak area, search for and suggest 2-3 specific educational resources
   - Include direct links to Khan Academy, Coursera, educational YouTube channels, or reputable study sites
   - Provide brief descriptions of why each resource is helpful

3. **Next Steps** (encouraging tone):
   - Actionable study plan based on their performance
   - Motivational message to keep them engaged

Format the response in markdown with clickable links. Search the web for current, high-quality educational resources related to their weak topics.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating AI summary with web search:', error);
      // Fallback to enhanced summary without web search
      return await this.generateFallbackSummaryWithLinks(state, byObjective, strengths, weaknesses);
    }
  }

  /**
   * Fallback summary generator with curated educational links
   */
  private async generateFallbackSummaryWithLinks(state: TestSessionState, byObjective: any[], strengths: string[], weaknesses: string[]): Promise<string> {
    const percentage = (state.correctCount / state.totalQuestions) * 100;

    // Curated educational resources by topic
    const resourceMap: Record<string, string[]> = {
      biology: ['[Khan Academy Biology](https://www.khanacademy.org/science/biology) - Comprehensive biology lessons', '[Crash Course Biology](https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF) - Engaging video series', '[Biology Online](https://www.biologyonline.com/) - Detailed biology reference'],
      cell: ['[Khan Academy Cell Biology](https://www.khanacademy.org/science/biology/structure-of-a-cell) - Cell structure and function', '[Cells Alive!](https://www.cellsalive.com/) - Interactive cell animations', '[Nature Cell Biology](https://www.nature.com/ncb/) - Advanced cell biology research'],
      genetics: ['[Khan Academy Genetics](https://www.khanacademy.org/science/biology/classical-genetics) - Genetics fundamentals', '[Genetics Home Reference](https://ghr.nlm.nih.gov/) - NIH genetics resource', '[Learn.Genetics](https://learn.genetics.utah.edu/) - University of Utah genetics tutorials'],
      chemistry: ['[Khan Academy Chemistry](https://www.khanacademy.org/science/chemistry) - Complete chemistry course', '[ChemLibreTexts](https://chem.libretexts.org/) - Open-access chemistry textbook', '[Crash Course Chemistry](https://www.youtube.com/playlist?list=PL8dPuuaLjXtPHzzYuWy6fYEaX9mQQ8oGr) - Chemistry video series'],
      physics: ['[Khan Academy Physics](https://www.khanacademy.org/science/physics) - Physics fundamentals', '[Physics Classroom](https://www.physicsclassroom.com/) - Interactive physics tutorials', '[MIT OpenCourseWare Physics](https://ocw.mit.edu/courses/physics/) - University-level physics courses'],
    };

    let summary = `## Performance Summary\n\n`;
    summary += `Great work completing this test! You scored **${state.correctCount} out of ${state.totalQuestions}** questions (${percentage.toFixed(1)}%). `;

    if (percentage >= 80) {
      summary += `This shows strong mastery of the material. `;
    } else if (percentage >= 60) {
      summary += `You're making good progress and building a solid foundation. `;
    } else {
      summary += `Every attempt helps you learn - keep building your understanding! `;
    }

    if (state.longestStreak > 3) {
      summary += `Your longest streak of ${state.longestStreak} correct answers shows you can maintain focus and apply concepts consistently.\n\n`;
    } else {
      summary += `Focus on building consistency in your understanding.\n\n`;
    }

    if (strengths.length > 0) {
      summary += `### 🎯 Strong Areas\nYou demonstrated solid understanding in: **${strengths.join(', ')}**. These are great foundations to build upon!\n\n`;
    }

    if (weaknesses.length > 0) {
      summary += `### 📚 Study Recommendations\n\n`;
      weaknesses.forEach((weakness) => {
        summary += `**${weakness}:**\n`;

        // Find matching resources
        const topicKey = Object.keys(resourceMap).find((key) => weakness.toLowerCase().includes(key) || key.includes(weakness.toLowerCase().split(' ')[0]));

        const resources = topicKey ? resourceMap[topicKey] : resourceMap['biology']; // Default to biology
        resources.forEach((resource) => {
          summary += `- ${resource}\n`;
        });
        summary += `\n`;
      });
    }

    summary += `### 🚀 Next Steps\n`;
    summary += `1. Review the topics where you scored below 70%\n`;
    summary += `2. Use the recommended resources above for targeted study\n`;
    summary += `3. Retake this test in a few days to track your improvement\n`;
    summary += `4. Focus on understanding concepts rather than memorizing facts\n\n`;
    summary += `Keep up the excellent work! Consistent practice leads to mastery. 💪`;

    return summary;
  }

  /**
   * Generate final encouragement message
   */
  private generateFinalEncouragement(state: TestSessionState): string {
    const percentage = (state.correctCount / state.totalQuestions) * 100;

    if (percentage >= 90) {
      return "Outstanding performance! You've mastered this material! 🌟";
    } else if (percentage >= 80) {
      return 'Great job! You have a strong understanding of the material. Keep it up! 💪';
    } else if (percentage >= 70) {
      return "Good work! With a bit more review, you'll master this content. 📚";
    } else if (percentage >= 60) {
      return "You're making progress! Focus on the weak areas and you'll improve quickly. 🎯";
    } else {
      return "Keep learning! Every attempt helps you understand better. Don't give up! 🚀";
    }
  }
}
