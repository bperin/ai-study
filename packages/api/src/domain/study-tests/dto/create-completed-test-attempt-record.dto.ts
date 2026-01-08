import { ApiProperty } from '@nestjs/swagger';

export class CompletedAttemptAnswerRecordDto {
  @ApiProperty()
  mcqId: string;

  @ApiProperty()
  selectedIdx: number;

  @ApiProperty()
  isCorrect: boolean;
}

export class CreateCompletedTestAttemptRecordDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: () => [CompletedAttemptAnswerRecordDto] })
  answers: CompletedAttemptAnswerRecordDto[];
}
