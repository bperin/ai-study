import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentRecordDto {
  @ApiProperty({ required: false, nullable: true })
  title?: string | null;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty({ required: false, nullable: true })
  sourceUri?: string | null;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  status!: string;
}
