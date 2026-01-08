import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, IsObject, IsUUID, Min } from 'class-validator';

export class CreateEvalItemDto {
  @ApiProperty({ description: 'ID of the evaluation this item belongs to' })
  @IsUUID()
  evalId: string;

  @ApiProperty({ description: 'Type of the evaluation item (e.g., multiple-choice, true-false)' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'The question or prompt text' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'Array of answer options', type: [String] })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ description: 'Index of the correct answer', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  correctIdx?: number;

  @ApiProperty({ description: 'Whether this item has an associated image', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  hasImage?: boolean;

  @ApiProperty({ description: 'URL of the image if hasImage is true', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'Prompt used to generate the image', required: false })
  @IsString()
  @IsOptional()
  imagePrompt?: string;

  @ApiProperty({ description: 'Hint text for students', required: false })
  @IsString()
  @IsOptional()
  hint?: string;

  @ApiProperty({ description: 'Explanation of the correct answer', required: false })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ description: 'Additional metadata for the item', required: false, type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
