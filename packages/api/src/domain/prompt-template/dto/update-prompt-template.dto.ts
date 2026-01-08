import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdatePromptTemplateDto {
  @ApiProperty({ description: 'Human-readable title for the prompt template', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Description of what this prompt template does', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'The actual prompt template text', required: false })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiProperty({ description: 'Additional metadata for the template', required: false, type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiProperty({ description: 'Whether this version is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
