import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @ApiProperty()
  @IsString()
  evalItemId: string;

  @ApiProperty()
  @IsNumber()
  selectedIdx: number;
}

export class SubmitTestDto {
  @ApiProperty()
  @IsString()
  evalId: string;

  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  userAnswers: AnswerDto[];
}
