import { ApiProperty } from '@nestjs/swagger';

export class StartAttemptResponseDto {
  @ApiProperty()
  attemptId: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  startedAt: Date;
}
