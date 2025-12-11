import { Body, Controller, Post, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { UploadsService } from "./uploads.service";

@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Post("sign")
    createSignedUploadUrl(@Body() body: CreateUploadUrlDto, @Request() req: any) {
        return this.uploadsService.generateUploadUrl(body.fileName, body.contentType, req.user.userId);
    }

    @Post("confirm")
    confirmUpload(@Body() body: ConfirmUploadDto, @Request() req: any) {
        return this.uploadsService.confirmUpload(body.filePath, body.fileName, req.user.userId);
    }
}
