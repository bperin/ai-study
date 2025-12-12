import { ApiProperty } from "@nestjs/swagger";

export class MissedQuestionDto {
    @ApiProperty()
    questionId: string;

    @ApiProperty()
    questionText: string;

    @ApiProperty()
    selectedAnswer: string;

    @ApiProperty()
    correctAnswer: string;
}

export class SubmitTestResultsDto {
    @ApiProperty()
    pdfId: string;

    @ApiProperty()
    score: number;

    @ApiProperty()
    totalQuestions: number;

    @ApiProperty({ type: [MissedQuestionDto] })
    missedQuestions: MissedQuestionDto[];
}

export class TestAnalysisResponseDto {
    @ApiProperty()
    summary: string;

    @ApiProperty({ type: [String] })
    weakAreas: string[];

    @ApiProperty({ type: [String] })
    studyStrategies: string[];
}