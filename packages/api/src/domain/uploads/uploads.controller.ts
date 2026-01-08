import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { ConfirmUploadResponseDto } from './dto/confirm-upload-response.dto';
import { GcsService } from './gcs.service';
import { JwtAuthGuard } from '../../shared/security/jwt-auth.guard';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly gcsService: GcsService) {}

  @Post('sign')
  @ApiResponse({ status: 201, type: UploadUrlResponseDto })
  createSignedUploadUrl(@Body() body: CreateUploadUrlDto, @Request() req): Promise<UploadUrlResponseDto> {
    return this.gcsService.generateUploadUrl(body.fileName, body.contentType, req.user.userId);
  }

  @Post('confirm')
  @ApiResponse({ status: 201, type: ConfirmUploadResponseDto })
  confirmUpload(@Body() body: ConfirmUploadDto, @Request() req): Promise<ConfirmUploadResponseDto> {
    return this.gcsService.confirmUpload(body.filePath, body.fileName, req.user.userId, body.subjectId);
  }

  @Post('test-sign')
  @ApiResponse({ status: 201, description: 'Test signing without auth' })
  async testSign(@Body() body: CreateUploadUrlDto) {
    try {
      const result = await this.gcsService.generateUploadUrl(body.fileName, body.contentType, 'test-user-id');
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error', stack: error?.stack };
    }
  }
}
