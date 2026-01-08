import { ApiProperty } from '@nestjs/swagger';

export class UpdateTestAttemptRecordDto {
  @ApiProperty({ required: false })
  score?: number;

  @ApiProperty({ required: false })
  total?: number;

  @ApiProperty({ required: false, nullable: true })
  percentage?: number | null;

  @ApiProperty({ required: false, type: String })
  summary?: string | null;

  @ApiProperty({ required: false, type: () => Date })
  completedAt?: Date | null;

  @ApiProperty({ required: false, type: Object })
  feedback?: any;
}
