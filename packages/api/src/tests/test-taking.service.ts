import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestAttemptRepository } from '../shared/repositories/test-attempt.repository';
import { McqRepository } from '../shared/repositories/mcq.repository';
import { UserAnswerRepository } from '../shared/repositories/user-answer.repository';
import { RetrieveService } from '../rag/services/retrieve.service';
import { createAdkRunner, isAdkAvailable } from '../ai/adk.helpers';
import { createTestAssistanceAgent } from '../ai/agents';
import { QueueService } from '../queue/queue.service';
import { PdfTextService } from '../shared/services/pdf-text.service';
import { GcsService } from '../pdfs/gcs.service';
import { GEMINI_MODEL } from '../constants/models';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

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
  
  // Alias for frontend compatibility
  answers?: {
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
    private readonly testAttemptRepository: TestAttemptRepository,
    private readonly mcqRepository: McqRepository,
    private readonly userAnswerRepository: UserAnswerRepository,
    private readonly retrieveService: RetrieveService,
    private readonly pdfTextService: PdfTextService,
    private readonly gcsService: GcsService,
    private readonly queueService: QueueService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
    this.logger.info('Getting or starting test session', { userId, pdfId });
    
    // Check for existing incomplete attempt
    let attempt = await this.testAttemptRepository.findActiveByUserAndPdf(userId, pdfId);

    if (!attempt) {
      // Create new attempt
      const totalQuestions = await this.mcqRepository.countByPdfId(pdfId);

      attempt = await this.testAttemptRepository.createWithAnswersIncluded({
        user: { connect: { id: userId } },
        pdf: { connect: { id: pdfId } },
        totalQuestions: totalQuestions,
      });
    }

    return this.rehydrateState(attempt);
  }

  /**
   * Get current session state (rehydrated)
   */
  async getSessionState(attemptId: string): Promise<TestSessionState> {
    const attempt = await this.testAttemptRepository.findByIdWithAnswers(attemptId);

    if (!attempt) throw new Error('Attempt not found');
    return this.rehydrateState(attempt);
  }

  /**
   * Rehydrate state from DB attempt
   */
  private async rehydrateState(attempt: any): Promise<TestSessionState> {
    const questions = await this.mcqRepository.findWithObjectives(attempt.pdfId);

    // Calculate metrics from existing answers
    let correctCount = 0;
    let incorrectCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let totalTimeSpent = 0;
    const topicScores = new Map<string, { correct: number; total: number; objectiveTitle: string }>();

    const processedAnswers = attempt.answers.map((a: any, index: number) => {
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
      const topicId = a.mcq.objectiveId;
      const currentScore = topicScores.get(topicId) || { correct: 0, total: 0, objectiveTitle: a.mcq.objective.title };
      currentScore.total++;
      if (isCorrect) currentScore.correct++;
      topicScores.set(topicId, currentScore);

      return {
        questionId: a.mcqId,
        questionNumber: index + 1,
        questionText: a.mcq.question,
        selectedAnswer: a.selectedIdx,
        correctAnswer: a.mcq.correctIdx,
        isCorrect,
        timeSpent: a.timeSpent,
        hintsUsed: a.hintsUsed,
      };
    });

    return {
      attemptId: attempt.id,
      userId: attempt.userId,
      currentQuestionIndex: processedAnswers.length,
      totalQuestions: questions.length, // Or attempt.total if fixed
      userAnswers: processedAnswers,
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
    const attempt = await this.testAttemptRepository.findByIdWithPdf(attemptId);

    if (!attempt) throw new NotFoundException('Attempt not found');

    const question = await this.mcqRepository.findById(questionId);

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
    const attempt = await this.testAttemptRepository.findByIdWithAnswers(attemptId);

    if (!attempt) throw new Error('Attempt not found');

    const state = await this.rehydrateState(attempt);

    // Get question details
    const question = await this.mcqRepository.findById(questionId);

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
    const existingAnswer = await this.userAnswerRepository.findByAttemptAndMcq(attemptId, questionId);

    if (existingAnswer) {
      // Update existing answer - latest attempt counts
      await this.userAnswerRepository.update(existingAnswer.id, {
        selectedIdx: selectedAnswer,
        isCorrect,
        timeSpent,
      });
    } else {
      // Create new answer
      await this.userAnswerRepository.create({
        attempt: { connect: { id: attemptId } },
        mcq: { connect: { id: questionId } },
        selectedIdx: selectedAnswer,
        isCorrect,
        timeSpent,
      });
    }

    // Generate encouragement
    const encouragement = this.generateFinalEncouragement(state);

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
   * Complete test and generate feedback
   */
  async completeTest(attemptId: string): Promise<any> {
    const attempt = await this.testAttemptRepository.findByIdWithAnswers(attemptId);

    if (!attempt) throw new Error('Attempt not found');
    const state = await this.rehydrateState(attempt);

    const percentage = (state.correctCount / state.totalQuestions) * 100;

    // Generate detailed feedback (basic metrics, not full AI analysis anymore)
    const feedback = await this.generateDetailedFeedback(state);

    // Update test attempt in database
    await this.testAttemptRepository.markCompleted(
      attemptId,
      Math.round((state.correctCount / state.totalQuestions) * 100),
      state.totalQuestions
    );

    // Queue background AI analysis
    await this.queueService.addTestAnalysisJob({
      testId: attemptId,
      userId: attempt.userId,
    });

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
    const wrongAnswers = state.userAnswers
      .filter((a) => !a.isCorrect)
      .map((a) => ({
        question: a.questionText,
        yourAnswer: `Option ${a.selectedAnswer + 1}`,
        correctAnswer: `Option ${a.correctAnswer + 1}`,
      }));

    return {
      strengths,
      weaknesses,
      byObjective,
      wrongAnswers,
      longestStreak: state.longestStreak,
      averageTimePerQuestion: Math.round(state.totalTimeSpent / state.totalQuestions),
      encouragement: this.generateFinalEncouragement(state),
    };
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
