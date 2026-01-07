import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentRecordDto {
  @ApiProperty()
  filename: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false, nullable: true })
  storagePath?: string | null;

  @ApiProperty({ required: false, nullable: true })
  content?: string | null;
}
