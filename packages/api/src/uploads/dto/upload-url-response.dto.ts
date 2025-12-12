import { ApiProperty } from "@nestjs/swagger";

export class UploadUrlResponseDto {
    @ApiProperty({
        description: "Signed URL for uploading the file to Google Cloud Storage",
        example: "https://storage.googleapis.com/bucket/path?signature=...",
    })
    uploadUrl: string;

    @ApiProperty({
        description: "Path where the file will be stored",
        example: "uploads/user-id/file-id-filename.pdf",
    })
    filePath: string;

    @ApiProperty({
        description: "Expiration time of the signed URL",
        example: "2025-12-12T05:54:23.322Z",
    })
    expiresAt: string;

    @ApiProperty({
        description: "Maximum file size in bytes",
        example: 10485760,
    })
    maxSizeBytes: number;
}
