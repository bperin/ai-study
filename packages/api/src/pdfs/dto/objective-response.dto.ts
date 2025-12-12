import { ApiProperty } from "@nestjs/swagger";

export class McqDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    question: string;

    @ApiProperty({ type: [String] })
    options: string[];

    @ApiProperty()
    correctIdx: number;

    @ApiProperty({ required: false })
    explanation?: string;

    @ApiProperty({ required: false })
    hint?: string;
}

export class ObjectiveResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    difficulty: string;

    @ApiProperty({ type: [McqDto] })
    mcqs: McqDto[];
}