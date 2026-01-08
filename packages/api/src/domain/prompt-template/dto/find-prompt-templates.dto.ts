import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindPromptTemplatesDto {
  @ApiProperty({ description: 'Filter by prompt template key', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ description: 'Filter by active status', required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiProperty({ description: 'Filter by creator user ID', required: false })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiProperty({ description: 'Number of records to skip for pagination', required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  skip?: number;

  @ApiProperty({ description: 'Number of records to take for pagination', required: false, default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  take?: number;
}
