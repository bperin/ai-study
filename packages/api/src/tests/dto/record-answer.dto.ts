import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class RecordAnswerDto {
    @ApiProperty()
    @IsString()
    questionId: string;

    @ApiProperty()
    @IsNumber()
    selectedAnswer: number;

    @ApiProperty()
    @IsNumber()
    timeSpent: number;
}

export class RecordAnswerResponseDto {
    @ApiProperty()
    isCorrect: boolean;

    @ApiProperty()
    currentScore: string;

    @ApiProperty()
    currentStreak: number;

    @ApiProperty()
    progress: string;

    @ApiProperty()
    encouragement: string;

    @ApiProperty()
    explanation: string;
}