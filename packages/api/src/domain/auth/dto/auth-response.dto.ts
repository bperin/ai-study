import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;
}
