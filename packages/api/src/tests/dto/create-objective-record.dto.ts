import { ApiProperty } from '@nestjs/swagger';

export class CreateObjectiveMcqRecordDto {
  @ApiProperty()
  question: string;

  @ApiProperty({ type: [String] })
  options: string[];

  @ApiProperty()
  correctIdx: number;

  @ApiProperty({ required: false, nullable: true })
  explanation?: string | null;

  @ApiProperty({ required: false, nullable: true })
  hint?: string | null;
}

export class CreateObjectiveRecordDto {
  @ApiProperty()
  pdfId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  difficulty: 'easy' | 'medium' | 'hard';

  @ApiProperty({ type: () => [CreateObjectiveMcqRecordDto] })
  mcqs: CreateObjectiveMcqRecordDto[];
}
