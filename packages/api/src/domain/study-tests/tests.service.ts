import { Injectable, NotFoundException } from '@nestjs/common';
import { EvalItem } from '@prisma/client';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestHistoryResponseDto, TestHistoryItemDto } from './dto/test-results.dto';
import { TestStatsDto } from './dto/test-stats.dto';
import { ChatAssistanceResponseDto } from './dto/chat-assistance.dto';
import { StartAttemptResponseDto } from './dto/start-attempt-response.dto';
import { SubmitTestResultsDto, TestAnalysisResponseDto } from './dto/test-results.dto';
import { RecordAnswerResponseDto } from './dto/record-answer.dto';
import { TestSessionStateDto } from './dto/test-session.dto';
import { GEMINI_MODEL } from '../constants/models';
import { GcsService } from '../uploads/gcs.service';
import { TestsRepository } from './tests.repository';
import { DocumentsRepository } from '../documents/documents.repository';
import { FileSearchService } from '../uploads/file-search.service';

@Injectable()
export class TestsService {
  constructor(
    private readonly testsRepository: TestsRepository,
    private readonly documentsRepository: DocumentsRepository,
    private readonly fileSearchService: FileSearchService,
  ) {}

  async submitTest(userId: string, dto: SubmitTestDto) {
    const evalItemIds = dto.userAnswers.map((a) => a.evalItemId);
    const evalItems = await this.testsRepository.findEvalItemsByIds(evalItemIds);
    const evalItemMap = new Map<string, EvalItem>(evalItems.map((item) => [item.id, item]));

    let score = 0;
    const answerData = dto.userAnswers.map((answer) => {
      const evalItem = evalItemMap.get(answer.evalItemId);
      if (!evalItem) throw new Error(`EvalItem not found: ${answer.evalItemId}`);

      const isCorrect = evalItem.correctIdx === answer.selectedIdx;
      if (isCorrect) score++;

      return {
        evalItemId: answer.evalItemId,
        selectedIdx: answer.selectedIdx,
        isCorrect,
      };
    });

    const total = dto.userAnswers.length;

    return this.testsRepository.createCompletedAttempt(userId, dto.evalId, score, total, answerData);
  }

  async getTestHistory(userId: string): Promise<TestHistoryResponseDto> {
    const attempts = await this.testsRepository.findUserAttempts(userId);
    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getAllTestHistory(): Promise<TestHistoryResponseDto> {
    const attempts = await this.testsRepository.findAllAttemptsWithDetails();
    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getTestStats(documentId: string): Promise<TestStatsDto> {
    const attempts = await this.testsRepository.findCompletedAttemptsByDocument(documentId);

    if (attempts.length === 0) {
      return {
        attemptCount: 0,
        avgScore: 0,
        topScorer: null,
        topScore: null,
      };
    }

    const avgScore = Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length);
    const topAttempt = attempts[0];

    // @ts-ignore
    const email = topAttempt.user?.email || 'Unknown';

    return {
      attemptCount: attempts.length,
      avgScore,
      topScorer: email.split('@')[0],
      topScore: Math.round(topAttempt.percentage || 0),
    };
  }

  async getAttemptDetails(userId: string, attemptId: string): Promise<TestHistoryItemDto> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }

    // @ts-ignore
    return TestHistoryItemDto.fromEntity(attempt);
  }

  // === Test Attempt Management (consolidated from TestAttemptsService) ===

  async startAttempt(evalId: string, userId: string): Promise<StartAttemptResponseDto> {
    // Verify the eval exists
    const eval = await this.testsRepository.findEvalById(evalId);
    if (!eval) {
      throw new NotFoundException('Eval not found');
    }

    const totalQuestions = await this.testsRepository.countEvalItemsByEvalId(evalId);

    const attempt = await this.testsRepository.createAttempt(userId, evalId, totalQuestions, 0);

    return {
      attemptId: attempt.id,
      evalId: evalId,
      startedAt: attempt.startedAt,
    };
  }

  async submitTestResults(body: SubmitTestResultsDto): Promise<TestAnalysisResponseDto & { attemptId: string }> {
    const attempt = await this.testsRepository.findAttemptById(body.attemptId);

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    const percentage = Math.round((body.score / body.totalQuestions) * 100);
    const analysis = {
      report: `# Test Performance Analysis Report

## Executive Summary
You scored ${body.score} out of ${body.totalQuestions} (${percentage}%). ${percentage >= 80 ? 'Great job! You have a strong understanding of the material.' : percentage >= 60 ? 'Good effort! Review the areas you missed to improve further.' : 'Keep studying! Focus on understanding the core concepts.'}

## Areas for Improvement
${
  body.missedQuestions.length > 0
    ? body.missedQuestions
        .slice(0, 3)
        .map((q) => `- **${q.questionText}**\n  - Your answer: ${q.selectedAnswer}\n  - Correct answer: ${q.correctAnswer}\n  - Review this concept in the study material`)
        .join('\n\n')
    : '- No specific areas identified - great job!'
}

## Study Strategy Recommendations
- Review the questions you missed and understand why the correct answer is right
- Re-read the relevant sections of the study material
- Try taking the test again to reinforce your knowledge

## Next Steps
Keep practicing and focus on understanding the underlying concepts. Each attempt helps you learn!`,
    };

    // Update attempt with feedback and score
    await this.testsRepository.updateAttempt(body.attemptId, body.score, body.totalQuestions, percentage, new Date(), undefined, analysis as any);

    return {
      attemptId: body.attemptId,
      ...(analysis as TestAnalysisResponseDto),
    };
  }

  // === Interactive Test Taking (simplified from TestTakingService) ===

  async getOrStartSession(userId: string, evalId: string): Promise<TestSessionStateDto> {
    // Verify the eval exists
    const eval = await this.testsRepository.findEvalById(evalId);
    if (!eval) {
      throw new NotFoundException('Eval not found');
    }

    // Check for existing incomplete attempt
    let attempt = await this.testsRepository.findActiveAttempt(userId, evalId);

    if (!attempt) {
      // Create new attempt
      const totalQuestions = await this.testsRepository.countEvalItemsByEvalId(evalId);
      attempt = await this.testsRepository.createAttempt(userId, evalId, totalQuestions, 0);
    }

    return this.buildSessionState(attempt);
  }

  async getSessionState(attemptId: string): Promise<TestSessionStateDto> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);

    if (!attempt) throw new NotFoundException('Attempt not found');
    return this.buildSessionState(attempt);
  }

  async recordAnswer(attemptId: string, questionId: string, selectedAnswer: number, timeSpent: number): Promise<RecordAnswerResponseDto> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');

    // Get question details
    const question = await this.testsRepository.findEvalItemById(questionId);
    if (!question) throw new NotFoundException('Question not found');

    const isCorrect = selectedAnswer === question.correctIdx;

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

    // Get updated attempt state
    const updatedAttempt = await this.testsRepository.findAttemptById(attemptId);
    const sessionState = this.buildSessionState(updatedAttempt!);

    return {
      isCorrect,
      currentScore: `${sessionState.correctCount}/${sessionState.answeredCount}`,
      progress: `${sessionState.answeredCount}/${sessionState.totalQuestions}`,
      explanation: question.explanation,
    };
  }

  async completeTest(attemptId: string): Promise<any> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');

    const sessionState = this.buildSessionState(attempt);
    const percentage = sessionState.totalQuestions > 0 ? (sessionState.correctCount / sessionState.totalQuestions) * 100 : 0;

    // Update test attempt in database
    await this.testsRepository.updateAttempt(attemptId, sessionState.correctCount, sessionState.totalQuestions, percentage, new Date());

    return {
      score: {
        correct: sessionState.correctCount,
        total: sessionState.totalQuestions,
        percentage,
      },
    };
  }

  private buildSessionState(attempt: any): TestSessionStateDto {
    const answers = attempt.answers || [];

    let correctCount = 0;
    let totalTimeSpent = 0;

    answers.forEach((answer: any) => {
      if (answer.isCorrect) correctCount++;
      totalTimeSpent += answer.timeSpent || 0;
    });

    return {
      attemptId: attempt.id,
      userId: attempt.userId,
      answeredCount: answers.length,
      totalQuestions: attempt.total,
      correctCount,
      incorrectCount: answers.length - correctCount,
      startTime: attempt.startedAt,
      totalTimeSpent,
    };
  }
}
