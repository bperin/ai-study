import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ArtifactStatus } from '@prisma/client';

export class UpdateArtifactDto {
  @ApiProperty({ enum: ArtifactStatus, required: false })
  @IsEnum(ArtifactStatus)
  @IsOptional()
  status?: ArtifactStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ required: false, type: 'object' })
  @IsObject()
  @IsOptional()
  json?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  storageUri?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiProperty({ required: false, type: 'object' })
  @IsObject()
  @IsOptional()
  meta?: any;
}
