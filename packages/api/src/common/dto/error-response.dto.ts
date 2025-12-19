import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty()
  error: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ required: false })
  path?: string;

  @ApiProperty({ required: false })
  details?: any;
}
