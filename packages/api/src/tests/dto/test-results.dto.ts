import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsArray, IsBoolean, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class MissedQuestionDto {
    @ApiProperty()
    @IsString()
    questionId: string;

    @ApiProperty()
    @IsString()
    questionText: string;

    @ApiProperty()
    @IsString()
    selectedAnswer: string;

    @ApiProperty()
    @IsString()
    correctAnswer: string;
}

export class TestResultAnswerDto {
    @ApiProperty()
    @IsString()
    questionId: string;

    @ApiProperty()
    @IsString()
    questionText: string;

    @ApiProperty()
    @IsString()
    selectedAnswer: string;

    @ApiProperty()
    @IsString()
    correctAnswer: string;

    @ApiProperty()
    @IsBoolean()
    isCorrect: boolean;
}

export class SubmitTestResultsDto {
    @ApiProperty()
    @IsString()
    attemptId: string;

    @ApiProperty()
    @IsNumber()
    score: number;

    @ApiProperty()
    @IsNumber()
    totalQuestions: number;

    @ApiProperty({ type: [MissedQuestionDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MissedQuestionDto)
    missedQuestions: MissedQuestionDto[];

    @ApiProperty({ type: [TestResultAnswerDto], required: false })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TestResultAnswerDto)
    allAnswers?: TestResultAnswerDto[];
}

export class ScoreDto {
    @ApiProperty()
    correct: number;

    @ApiProperty()
    total: number;

    @ApiProperty()
    percentage: number;
}

export class WrongAnswerDto {
    @ApiProperty()
    question: string;

    @ApiProperty()
    yourAnswer: string;

    @ApiProperty()
    correctAnswer: string;
}

export class ObjectiveResultDto {
    @ApiProperty()
    objectiveTitle: string;

    @ApiProperty()
    correct: number;

    @ApiProperty()
    total: number;

    @ApiProperty()
    percentage: number;
}

export class FeedbackDto {
    @ApiProperty({ type: [String] })
    strengths: string[];

    @ApiProperty({ type: [String] })
    weaknesses: string[];

    @ApiProperty({ type: [ObjectiveResultDto] })
    byObjective: ObjectiveResultDto[];

    @ApiProperty({ type: [WrongAnswerDto] })
    wrongAnswers: WrongAnswerDto[];

    @ApiProperty()
    longestStreak: number;

    @ApiProperty()
    averageTimePerQuestion: number;

    @ApiProperty()
    encouragement: string;
}

export class TestAnalysisResponseDto {
    @ApiProperty()
    report: string;
}

export class TestHistoryItemDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    pdfId: string;

    @ApiProperty()
    pdfTitle: string;

    @ApiProperty()
    score: number;

    @ApiProperty()
    total: number;

    @ApiProperty()
    percentage: number;

    @ApiProperty()
    completedAt: Date;

    @ApiProperty({ required: false })
    report?: string;

    @ApiProperty({ required: false })
    summary?: string;

    @ApiProperty({ required: false })
    userId?: string;

    @ApiProperty({ required: false })
    userEmail?: string;

    @ApiProperty({ type: [TestResultAnswerDto], required: false })
    answers?: TestResultAnswerDto[];

    static fromEntity(attempt: any): TestHistoryItemDto {
        let percentage = attempt.percentage;
        if (percentage === null || percentage === undefined) {
            percentage = attempt.total > 0 ? (attempt.score / attempt.total) * 100 : 0;
        }

        const answers = attempt.answers
            ? attempt.answers.map((a: any) => ({
                  questionId: a.mcqId,
                  questionText: a.mcq?.question || "Unknown Question",
                  selectedAnswer: a.mcq?.options[a.selectedIdx] || "Unknown Answer",
                  correctAnswer: a.mcq?.options[a.mcq.correctIdx] || "Unknown Correct Answer",
                  isCorrect: a.isCorrect,
              }))
            : undefined;

        return {
            id: attempt.id,
            pdfId: attempt.pdfId,
            pdfTitle: attempt.pdf?.filename || "Unknown PDF",
            score: attempt.score,
            total: attempt.total,
            percentage: percentage,
            completedAt: attempt.completedAt,
            report: (attempt.feedback as any)?.report || undefined,
            summary: attempt.summary || undefined,
            userId: attempt.user?.id,
            userEmail: attempt.user?.email,
            answers,
        };
    }
}

export class TestHistoryResponseDto {
    @ApiProperty({ type: [TestHistoryItemDto] })
    attempts: TestHistoryItemDto[];

    @ApiProperty()
    totalAttempts: number;

    static fromEntities(attempts: any[]): TestHistoryResponseDto {
        return {
            attempts: attempts.map((attempt) => TestHistoryItemDto.fromEntity(attempt)),
            totalAttempts: attempts.length,
        };
    }
}
