import { Body, Controller, Post } from '@nestjs/common';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('sign')
  createSignedUploadUrl(@Body() body: CreateUploadUrlDto) {
    return this.uploadsService.generateUploadUrl(body.fileName, body.contentType);
  }
}
