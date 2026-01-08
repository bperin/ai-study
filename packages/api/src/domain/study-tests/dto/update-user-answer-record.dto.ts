import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserAnswerRecordDto {
  @ApiProperty({ required: false })
  selectedIdx?: number;

  @ApiProperty({ required: false })
  isCorrect?: boolean;

  @ApiProperty({ required: false })
  timeSpent?: number;
}
