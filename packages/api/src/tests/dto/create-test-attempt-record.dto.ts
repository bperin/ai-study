import { ApiProperty } from '@nestjs/swagger';

export class CreateTestAttemptRecordDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  pdfId: string;

  @ApiProperty({ description: 'Total number of questions included in this attempt' })
  total: number;

  @ApiProperty({ required: false, default: 0 })
  score?: number;

  @ApiProperty({ required: false, nullable: true })
  percentage?: number | null;
}
