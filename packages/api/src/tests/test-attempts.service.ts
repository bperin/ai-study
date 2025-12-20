import { Injectable, NotFoundException } from '@nestjs/common';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { StartAttemptResponseDto } from './dto/start-attempt-response.dto';
import { SubmitTestResultsDto, TestAnalysisResponseDto } from './dto/test-results.dto';
import { TestsRepository } from './tests.repository';
import { CreateTestAttemptRecordDto } from './dto/create-test-attempt-record.dto';
import { UpdateTestAttemptRecordDto } from './dto/update-test-attempt-record.dto';

@Injectable()
export class TestAttemptsService {
  constructor(
    private readonly testsRepository: TestsRepository,
    private readonly parallelGenerationService: ParallelGenerationService,
  ) {}

  async startAttempt(pdfId: string, userId: string): Promise<StartAttemptResponseDto> {
    const createDto = new CreateTestAttemptRecordDto();
    createDto.userId = userId;
    createDto.pdfId = pdfId;
    createDto.total = 0;
    createDto.score = 0;
    const attempt = await this.testsRepository.createAttempt(createDto);

    return {
      attemptId: attempt.id,
      pdfId: attempt.pdfId,
      startedAt: attempt.startedAt,
    };
  }

  async submitTest(body: SubmitTestResultsDto): Promise<TestAnalysisResponseDto & { attemptId: string }> {
    const attempt = await this.testsRepository.findAttemptById(body.attemptId);

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    let analysis;
    try {
      // Analyze results with AI (now with web search and all answers)
      console.log(`Analyzing test results for PDF: ${attempt.pdfId}`);
      analysis = await this.parallelGenerationService.analyzeTestResults(attempt.pdfId, body.missedQuestions, body.allAnswers);

      // The analysis already contains the markdown report
    } catch (error) {
      console.error('AI analysis failed, using fallback:', error);
      // Fallback analysis if AI fails
      const percentage = Math.round((body.score / body.totalQuestions) * 100);
      analysis = {
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
    }

    // Update attempt with feedback and score
    const updateDto = new UpdateTestAttemptRecordDto();
    updateDto.score = body.score;
    updateDto.total = body.totalQuestions;
    updateDto.percentage = (body.score / body.totalQuestions) * 100;
    updateDto.completedAt = new Date();
    updateDto.feedback = analysis as any;
    await this.testsRepository.updateAttempt(body.attemptId, updateDto);

    return {
      attemptId: body.attemptId,
      ...(analysis as TestAnalysisResponseDto),
    };
  }
}
