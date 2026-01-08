import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUploadResponseDto {
  @ApiProperty({
    description: 'ID of the created PDF record',
    example: '12cb4237-d74f-4cda-998d-4ef35f56...',
  })
  id: string;

  @ApiProperty({
    description: 'Filename of the uploaded PDF',
    example: 'study-material.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'User ID who uploaded the file',
    example: '2778db4c-ec62-49d4-a0d1-229f6f3c15de',
  })
  userId: string;

  @ApiProperty({
    description: 'Subject ID the document belongs to',
    example: '3a3d2e1b-4f5g-6h7i-8j9k...',
    nullable: true,
  })
  subjectId?: string;
}
