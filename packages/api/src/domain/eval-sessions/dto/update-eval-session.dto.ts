import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateEvalSessionDto {
  @ApiProperty({ type: 'object', required: false, description: 'User preferences for the evaluation session' })
  @IsObject()
  @IsOptional()
  userPreferences?: any;

  @ApiProperty({ required: false, description: 'Difficulty level for the evaluation' })
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiProperty({ required: false, description: 'Total number of items to include' })
  @IsNumber()
  @IsOptional()
  totalItems?: number;

  @ApiProperty({ required: false, description: 'Whether to include images in the evaluation' })
  @IsBoolean()
  @IsOptional()
  includeImages?: boolean;

  @ApiProperty({ required: false, description: 'Number of images to include' })
  @IsNumber()
  @IsOptional()
  imageCount?: number;

  @ApiProperty({ required: false, description: 'Time limit in minutes for the evaluation' })
  @IsNumber()
  @IsOptional()
  timeLimitMins?: number;

  @ApiProperty({ required: false, description: 'Status of the evaluation session' })
  @IsString()
  @IsOptional()
  status?: string;
}
