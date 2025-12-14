import { Body, Controller, Post, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { UploadUrlResponseDto } from "./dto/upload-url-response.dto";
import { ConfirmUploadResponseDto } from "./dto/confirm-upload-response.dto";
import { UploadsService } from "./uploads.service";

@ApiTags("uploads")
@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Post("sign")
    @ApiResponse({ status: 201, type: UploadUrlResponseDto })
    createSignedUploadUrl(@Body() body: CreateUploadUrlDto, @Request() req: any): Promise<UploadUrlResponseDto> {
        return this.uploadsService.generateUploadUrl(body.fileName, body.contentType, req.user.userId);
    }

    @Post("confirm")
    @ApiResponse({ status: 201, type: ConfirmUploadResponseDto })
    confirmUpload(@Body() body: ConfirmUploadDto, @Request() req: any): Promise<ConfirmUploadResponseDto> {
        return this.uploadsService.confirmUpload(body.filePath, body.fileName, req.user.userId);
    }

    @Post("test-sign")
    @ApiResponse({ status: 201, description: "Test signing without auth" })
    async testSign(@Body() body: CreateUploadUrlDto) {
        try {
            const result = await this.uploadsService.generateUploadUrl(body.fileName, body.contentType, "test-user-id");
            return { success: true, result };
        } catch (error: any) {
            return { success: false, error: error?.message || 'Unknown error', stack: error?.stack };
        }
    }
}
