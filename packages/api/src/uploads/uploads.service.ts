import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UploadsService {
    private storage: Storage;
    private bucketName: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {
        const serviceAccountKey = this.configService.get<string>("GCP_SA_KEY");
        
        if (serviceAccountKey) {
            // Parse the service account JSON key
            try {
                const credentials = JSON.parse(serviceAccountKey);
                this.storage = new Storage({
                    projectId: credentials.project_id,
                    credentials: credentials,
                });
                this.bucketName = this.configService.get<string>("GCP_BUCKET_NAME") ?? "missing-bucket";
                return;
            } catch (error) {
                console.error("Failed to parse GCP_SA_KEY:", error);
                throw new Error("Invalid GCP_SA_KEY format. Please provide a valid service account JSON key.");
            }
        }

        throw new Error("GCP_SA_KEY is required for Google Cloud Storage authentication.");
    }


    async generateUploadUrl(fileName: string, contentType: string, userId: string) {
        if (!this.bucketName || this.bucketName === "missing-bucket") {
            throw new InternalServerErrorException("GCP_BUCKET_NAME is not set");
        }

        // Validate that the content type is PDF
        if (contentType !== "application/pdf") {
            throw new InternalServerErrorException("Only PDF files are allowed");
        }

        // Sanitize filename and add user isolation
        const sanitizedName = fileName.trim().replace(/[^a-zA-Z0-9.-]/g, "-");
        const filePath = `uploads/${userId}/${randomUUID()}-${sanitizedName}`;
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(filePath);

        // Generate signed URL with minimal constraints to avoid 403 errors
        const [uploadUrl] = await file.getSignedUrl({
            version: "v4",
            action: "write",
            expires: expiresAt,
            contentType,
        });

        return {
            uploadUrl: uploadUrl,
            filePath,
            expiresAt: new Date(expiresAt).toISOString(),
            maxSizeBytes: 10485760, // 10MB in bytes (enforce client-side)
        };
    }

    async confirmUpload(filePath: string, fileName: string, userId: string) {
        // Save PDF metadata to database
        const pdf = await this.prisma.pdf.create({
            data: {
                filename: fileName,
                userId: userId,
                gcsPath: filePath, // Store GCS path
            },
        });

        return {
            id: pdf.id,
            filename: pdf.filename,
            userId: pdf.userId,
        };
    }
}
