import { ApiProperty } from '@nestjs/swagger';

export class StartAttemptResponseDto {
  @ApiProperty()
  attemptId: string;

  @ApiProperty()
  evalId: string;

  @ApiProperty()
  startedAt: Date;
}
