import { ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentIdentifierDto {
  @ApiPropertyOptional({ nullable: true })
  sourceUri?: string | null;

  @ApiPropertyOptional({ nullable: true })
  title?: string | null;
}
