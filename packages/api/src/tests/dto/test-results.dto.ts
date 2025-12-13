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

export class AnswerDto {
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

    @ApiProperty({ type: [AnswerDto], required: false })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnswerDto)
    allAnswers?: AnswerDto[];
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

    static fromEntity(attempt: any): TestHistoryItemDto {
        return {
            id: attempt.id,
            pdfId: attempt.pdfId,
            pdfTitle: attempt.pdf?.filename || 'Unknown PDF',
            score: attempt.score,
            total: attempt.total,
            percentage: attempt.percentage,
            completedAt: attempt.completedAt,
            report: (attempt.feedback as any)?.report || undefined
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
            attempts: attempts.map(attempt => TestHistoryItemDto.fromEntity(attempt)),
            totalAttempts: attempts.length
        };
    }
}