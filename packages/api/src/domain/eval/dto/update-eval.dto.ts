import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';

export class UpdateEvalDto {
  @ApiProperty({ description: 'Title of the evaluation', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Description of the evaluation', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Difficulty level',
    required: false,
    enum: ['easy', 'medium', 'hard'],
  })
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiProperty({ description: 'Instructions for taking the evaluation', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiProperty({ description: 'Rubric for grading', required: false, type: 'object' })
  @IsObject()
  @IsOptional()
  rubric?: any;

  @ApiProperty({ description: 'Subject ID this evaluation belongs to', required: false })
  @IsUUID()
  @IsOptional()
  subjectId?: string;
}
