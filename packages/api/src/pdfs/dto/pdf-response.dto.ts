import { ApiProperty } from '@nestjs/swagger';

export class PdfResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    type: [Object],
    example: [{ title: 'Objective Title', difficulty: 'easy', _count: { mcqs: 5 } }],
  })
  objectives: { title: string; difficulty: string; _count: { mcqs: number } }[];

  @ApiProperty({ required: false })
  stats?: {
    attemptCount: number;
    avgScore: number;
    topScorer: string | null;
    topScore: number | null;
  };

  @ApiProperty({ required: false, description: 'The current RAG processing status of the document' })
  status?: string;
}

export class PaginatedPdfResponseDto {
  @ApiProperty({ type: [PdfResponseDto] })
  data: PdfResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
