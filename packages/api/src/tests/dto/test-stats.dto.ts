import { ApiProperty } from '@nestjs/swagger';

export class TestStatsDto {
  @ApiProperty()
  attemptCount: number;

  @ApiProperty()
  avgScore: number;

  @ApiProperty({ required: false, nullable: true })
  topScorer: string | null;

  @ApiProperty({ required: false, nullable: true })
  topScore: number | null;
}
