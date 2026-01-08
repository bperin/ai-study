import { Injectable, NotFoundException } from '@nestjs/common';
import { EvalItem } from '@prisma/client';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestHistoryResponseDto, TestHistoryItemDto } from './dto/test-results.dto';
import { TestStatsDto } from './dto/test-stats.dto';
import { ChatAssistanceResponseDto } from './dto/chat-assistance.dto';
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

  async getTestStats(evalId: string): Promise<TestStatsDto> {
    const attempts = await this.testsRepository.findCompletedAttemptsByEval(evalId);

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
}
