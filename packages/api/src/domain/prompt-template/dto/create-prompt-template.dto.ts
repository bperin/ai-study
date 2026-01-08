import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class CreatePromptTemplateDto {
  @ApiProperty({ description: 'Unique key for the prompt template' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Version number', required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiProperty({ description: 'Whether this version is active', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Human-readable title for the prompt template' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of what this prompt template does', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'The actual prompt template text' })
  @IsString()
  template: string;

  @ApiProperty({ description: 'Additional metadata for the template', required: false, type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiProperty({ description: 'ID of the user who created this template', required: false })
  @IsString()
  @IsOptional()
  createdBy?: string;
}
