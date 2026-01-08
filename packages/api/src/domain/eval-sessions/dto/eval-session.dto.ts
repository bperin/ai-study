import { ApiProperty } from '@nestjs/swagger';

export class EvalSessionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: 'object' })
  userPreferences: any;

  @ApiProperty({ type: 'object', required: false })
  proposedPlan?: any;

  @ApiProperty()
  planStatus: string;

  @ApiProperty()
  iterationCount: number;

  @ApiProperty({ required: false })
  difficulty?: string;

  @ApiProperty({ required: false })
  totalItems?: number;

  @ApiProperty()
  includeImages: boolean;

  @ApiProperty()
  imageCount: number;

  @ApiProperty({ required: false })
  timeLimitMins?: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
