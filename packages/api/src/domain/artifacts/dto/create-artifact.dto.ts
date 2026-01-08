import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsObject, IsUUID } from 'class-validator';
import { ArtifactStatus, ArtifactType } from '@prisma/client';

export class CreateArtifactDto {
  @ApiProperty({ enum: ArtifactType })
  @IsEnum(ArtifactType)
  type: ArtifactType;

  @ApiProperty({ enum: ArtifactStatus, required: false, default: ArtifactStatus.PENDING })
  @IsEnum(ArtifactStatus)
  @IsOptional()
  status?: ArtifactStatus;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  evalId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  evalItemId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  attemptId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  storageUri?: string;

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
  model?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  prompt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  inputHash?: string;

  @ApiProperty({ required: false, type: 'object' })
  @IsObject()
  @IsOptional()
  meta?: any;
}
