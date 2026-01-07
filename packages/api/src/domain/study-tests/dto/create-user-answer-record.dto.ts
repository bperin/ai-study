import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAnswerRecordDto {
  @ApiProperty()
  attemptId: string;

  @ApiProperty()
  mcqId: string;

  @ApiProperty()
  selectedIdx: number;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty()
  timeSpent: number;
}
