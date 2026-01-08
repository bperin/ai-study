import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, IsUUID, Min, Max } from 'class-validator';

export class CreateEvalItemReviewDto {
  @ApiProperty({ description: 'ID of the eval item being reviewed' })
  @IsUUID()
  evalItemId: string;

  @ApiProperty({ description: 'ID of the user reviewing the eval item' })
  @IsUUID()
  reviewerId: string;

  @ApiProperty({ description: 'Whether the eval item is correct' })
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty({ description: 'Optional feedback text', required: false })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiProperty({
    description: 'Difficulty rating',
    required: false,
    enum: ['easy', 'medium', 'hard'],
  })
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiProperty({
    description: 'Quality rating from 1-5',
    required: false,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  quality?: number;

  @ApiProperty({
    description: 'Array of tags for categorization',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
