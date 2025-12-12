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

export class TestAnalysisResponseDto {
    @ApiProperty()
    summary: string;

    @ApiProperty({ type: [String] })
    weakAreas: string[];

    @ApiProperty({ type: [String] })
    studyStrategies: string[];

    @ApiProperty({ type: [String], required: false })
    strengths?: string[];
}