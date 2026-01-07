import { ApiProperty } from '@nestjs/swagger';

export class CreateUserRecordDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, default: false })
  isAdmin?: boolean;
}
