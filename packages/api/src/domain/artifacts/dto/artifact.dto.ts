import { ApiProperty } from '@nestjs/swagger';
import { ArtifactStatus, ArtifactType } from '@prisma/client';

export class ArtifactDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ArtifactType })
  type: ArtifactType;

  @ApiProperty({ enum: ArtifactStatus })
  status: ArtifactStatus;

  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ required: false })
  documentId?: string;

  @ApiProperty({ required: false })
  evalId?: string;

  @ApiProperty({ required: false })
  evalItemId?: string;

  @ApiProperty({ required: false })
  attemptId?: string;

  @ApiProperty({ required: false })
  mimeType?: string;

  @ApiProperty({ required: false })
  storageUri?: string;

  @ApiProperty({ required: false })
  text?: string;

  @ApiProperty({ required: false, type: 'object' })
  json?: any;

  @ApiProperty({ required: false })
  model?: string;

  @ApiProperty({ required: false })
  prompt?: string;

  @ApiProperty({ required: false })
  inputHash?: string;

  @ApiProperty({ required: false, type: 'object' })
  meta?: any;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
