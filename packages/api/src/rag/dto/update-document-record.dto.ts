import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentRecordDto {
  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional({ nullable: true })
  errorMessage?: string | null;

  @ApiPropertyOptional({ nullable: true })
  mimeType?: string | null;
}
