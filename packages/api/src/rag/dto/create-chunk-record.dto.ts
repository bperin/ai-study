import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChunkRecordDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  chunkIndex!: number;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  startChar!: number;

  @ApiProperty()
  endChar!: number;

  @ApiPropertyOptional({ type: [Number], nullable: true })
  embeddingJson?: number[] | null;
}
