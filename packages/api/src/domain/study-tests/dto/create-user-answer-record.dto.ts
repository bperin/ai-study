import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAnswerRecordDto {
  @ApiProperty()
  attemptId: string;

  @ApiProperty()
  evalItemId: string;

  @ApiProperty()
  selectedIdx: number;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty()
  timeSpent: number;
}
