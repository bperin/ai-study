import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';

export class UpdateEvalItemReviewDto {
  @ApiProperty({ description: 'Whether the eval item is correct', required: false })
  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;

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
