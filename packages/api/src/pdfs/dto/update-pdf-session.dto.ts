import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePdfSessionDto {
  @ApiPropertyOptional({ enum: ['generating', 'completed', 'failed'] })
  status?: 'generating' | 'completed' | 'failed';

  @ApiPropertyOptional({ nullable: true })
  errorMessage?: string | null;
}
