import { ApiProperty } from '@nestjs/swagger';

export class SampleQuestionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  question: string;

  @ApiProperty({ type: [String] })
  options: string[];
}

export class DocumentResponseDto {
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

  @ApiProperty({ required: false, description: 'Total number of questions available for this document' })
  questionCount?: number;

  @ApiProperty({ 
    type: [SampleQuestionDto], 
    required: false, 
    description: 'Sample questions to preview the test content' 
  })
  sampleQuestions?: SampleQuestionDto[];
}

export class PaginatedDocumentResponseDto {
  @ApiProperty({ type: [DocumentResponseDto] })
  data: DocumentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
