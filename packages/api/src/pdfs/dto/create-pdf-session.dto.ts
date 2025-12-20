import { ApiProperty } from '@nestjs/swagger';

export class CreatePdfSessionDto {
  @ApiProperty()
  pdfId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false, type: 'object', additionalProperties: true })
  userPreferences?: Record<string, any>;

  @ApiProperty({ enum: ['generating', 'completed', 'failed'] })
  status: 'generating' | 'completed' | 'failed';
}
