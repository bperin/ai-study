import { ApiProperty } from '@nestjs/swagger';

export class CreatePdfRecordDto {
  @ApiProperty()
  filename: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false, nullable: true })
  gcsPath?: string | null;

  @ApiProperty({ required: false, nullable: true })
  content?: string | null;
}
