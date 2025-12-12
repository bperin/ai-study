import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsArray, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AnswerDto {
    @ApiProperty()
    @IsString()
    mcqId: string;

    @ApiProperty()
    @IsNumber()
    selectedIdx: number;
}

export class SubmitTestDto {
    @ApiProperty()
    @IsString()
    pdfId: string;

    @ApiProperty({ type: [AnswerDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnswerDto)
    answers: AnswerDto[];
}
