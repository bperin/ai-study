import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserRecordDto {
  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  password?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional({ default: false })
  isAdmin?: boolean;

  @ApiPropertyOptional({ nullable: true })
  provider?: string | null;
}
