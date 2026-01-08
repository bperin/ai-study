import { Injectable } from '@nestjs/common';
import { TestsRepository } from './tests.repository';

/**
 * In-memory state for active test sessions
 */
export interface TestSessionState {
  attemptId: string;
  userId: string;
  currentQuestionIndex: number;
  totalQuestions: number;

  // Answer tracking
  userAnswers: {
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
  constructor(private readonly testsRepository: TestsRepository) {}

  /**
   * Initialize or Resume a test session
   */
  async getOrStartSession(userId: string, pdfId: string): Promise<TestSessionState> {
    // Check for existing incomplete attempt
    let attempt = await this.testsRepository.findActiveAttempt(userId, pdfId);

    if (!attempt) {
      // Create new attempt
      const totalQuestions = await this.testsRepository.countMcqsByDocumentId(pdfId);
      const newAttempt = await this.testsRepository.createAttempt(userId, pdfId, totalQuestions, 0);
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
    // @ts-ignore
    const dbAnswers = attempt.answers || [];

    // Calculate metrics from existing answers
    let correctCount = 0;
    let incorrectCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let totalTimeSpent = 0;
    const topicScores = new Map<string, { correct: number; total: number; objectiveTitle: string }>();

    const processedAnswers = dbAnswers.map((a: any, index: number) => {
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
      totalQuestions: attempt.total,
      userAnswers: processedAnswers,
      correctCount,
      incorrectCount,
      currentStreak,
      longestStreak,
      topicScores,
      startTime: attempt.startedAt,
      totalTimeSpent,
      totalHintsUsed: 0,
      questionsSkipped: 0,
    };
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
    state.userAnswers.push({
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
      const updatedTimeSpent = (existingAnswer.timeSpent ?? 0) + timeSpent;
      await this.testsRepository.updateUserAnswer(existingAnswer.id, selectedAnswer, isCorrect, updatedTimeSpent);
    } else {
      // Create new answer
      await this.testsRepository.createUserAnswer(attemptId, questionId, selectedAnswer, isCorrect, timeSpent);
    }

    // Generate encouragement
    const encouragement = this.generateEncouragement(state);

    return {
      isCorrect,
      currentScore: `${state.correctCount}/${state.userAnswers.length}`,
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
    } else if (state.userAnswers.length > 0 && state.correctCount / state.userAnswers.length > 0.8) {
      template = "⭐ Excellent work! [CURRENT_SCORE] - you're mastering this!";
    } else if (state.userAnswers.length > 0 && state.userAnswers[state.userAnswers.length - 1].isCorrect) {
      template = '✅ Correct! [CURRENT_SCORE]. [PROGRESS]';
    } else if (state.incorrectCount > state.correctCount && state.userAnswers.length > 0) {
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
      state.userAnswers.length > 0
        ? (() => {
            // Find topic from topicScores
            for (const [_, score] of state.topicScores.entries()) {
              return score.objectiveTitle;
            }
            return '';
          })()
        : '';

    const replacements: Record<string, string> = {
      '[CURRENT_SCORE]': `${state.correctCount}/${state.userAnswers.length}`,
      '[CORRECT_COUNT]': state.correctCount.toString(),
      '[INCORRECT_COUNT]': state.incorrectCount.toString(),
      '[CURRENT_STREAK]': state.currentStreak.toString(),
      '[PROGRESS]': `Question ${state.currentQuestionIndex}/${state.totalQuestions}`,
      '[TIME_ELAPSED]': `${Math.floor(state.totalTimeSpent / 60)} minutes`,
      '[LAST_ANSWER]': state.userAnswers.length > 0 ? (state.userAnswers[state.userAnswers.length - 1].isCorrect ? 'correct' : 'incorrect') : '',
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

    // Update test attempt in database
    await this.testsRepository.updateAttempt(attemptId, state.correctCount, state.totalQuestions, percentage, new Date());

    return {
      score: {
        correct: state.correctCount,
        total: state.totalQuestions,
        percentage,
      },
    };
  }
}
