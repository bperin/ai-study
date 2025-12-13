import { ApiProperty } from "@nestjs/swagger";

export class PdfResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    filename: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty({
        type: [Object],
        example: [{ title: "Objective Title", difficulty: "easy", _count: { mcqs: 5 } }],
    })
    objectives: { title: string; difficulty: string; _count: { mcqs: number } }[];
}
