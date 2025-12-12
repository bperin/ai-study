import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";

@Injectable()
export class GcsService {
    private storage: Storage;
    private bucketName: string;

    constructor(private readonly configService: ConfigService) {
        const projectId = this.configService.get<string>("GCP_PROJECT_ID");
        const clientEmail = this.configService.get<string>("GCP_CLIENT_EMAIL");
        const privateKey = this.resolvePrivateKey();

        this.storage = new Storage({
            projectId,
            credentials:
                clientEmail && privateKey
                    ? {
                          client_email: clientEmail,
                          private_key: privateKey,
                      }
                    : undefined,
        });

        this.bucketName = this.configService.get<string>("GCP_BUCKET_NAME") ?? "missing-bucket";
    }

    private resolvePrivateKey(): string | undefined {
        const rawKey = this.configService.get<string>("GCP_PRIVATE_KEY");
        if (rawKey) {
            return rawKey.replace(/\\n/g, "\n");
        }

        const base64Key = this.configService.get<string>("GCP_PRIVATE_KEY_BASE64");
        if (base64Key) {
            return Buffer.from(base64Key, "base64").toString("utf8");
        }

        return undefined;
    }

    /**
     * Download a file from Google Cloud Storage
     */
    async downloadFile(filePath: string): Promise<Buffer> {
        const file = this.storage.bucket(this.bucketName).file(filePath);
        const [buffer] = await file.download();
        return buffer;
    }

    /**
     * Get the bucket name
     */
    getBucketName(): string {
        return this.bucketName;
    }
}
