import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Storage } from '@google-cloud/storage';

export interface FileSearchUploadResult {
  fileId: string;
  storeId: string;
  displayName: string;
  mimeType: string;
  uri: string;
  sizeBytes: number;
  state: string;
}

@Injectable()
export class FileSearchService {
  private readonly logger = new Logger(FileSearchService.name);
  private readonly client: GoogleGenAI;
  private readonly modelName: string;
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set.');
    }

    this.client = new GoogleGenAI({ apiKey });
    this.modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    
    this.storage = new Storage({
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'slap-ai-481400',
    });
    this.bucketName = this.configService.get<string>('GCP_BUCKET_NAME') ?? 'missing-bucket';
  }

  async uploadFromGcs(gcsFilePath: string, displayName: string, existingStoreId?: string): Promise<FileSearchUploadResult> {
    const tempFilePath = path.join(os.tmpdir(), `gemini-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
    
    try {
      // 1. Download from GCS to local temp file
      this.logger.log(`Downloading ${gcsFilePath} from GCS to ${tempFilePath}`);
      await this.storage.bucket(this.bucketName).file(gcsFilePath).download({ destination: tempFilePath });
      const stats = fs.statSync(tempFilePath);

      // 2. Upload to Gemini File API
      this.logger.log(`Uploading ${displayName} to Gemini File API`);
      const uploadResponse = await this.client.files.upload({
        file: tempFilePath,
        config: { displayName }
      });
      const geminiFile = uploadResponse;
      this.logger.log(`Uploaded to Gemini File API: ${geminiFile.name}`);

      // 3. Get or Create FileSearchStore
      let storeId = existingStoreId;
      if (!storeId) {
        const fileSearchStore = await this.client.fileSearchStores.create({
            config: { displayName: `store-${displayName.replace(/[^a-zA-Z0-9_-]/g, '_')}` }
        });
        storeId = fileSearchStore.name;
        this.logger.log(`Created new FileSearchStore: ${storeId}`);
      } else {
        this.logger.log(`Using existing FileSearchStore: ${storeId}`);
      }

      // 4. Import file into store
      let operation = await this.client.fileSearchStores.importFile({
        fileSearchStoreName: storeId,
        fileName: geminiFile.name
      });
      this.logger.log(`Import operation started: ${operation.name}`);

      // 5. Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        operation = await this.client.operations.get({ operation: (operation as any).name || operation });
      }

      if (operation.error) {
        throw new Error(`Import failed: ${JSON.stringify(operation.error)}`);
      }

      return {
        fileId: geminiFile.name,
        storeId: storeId,
        displayName: displayName,
        mimeType: 'application/pdf',
        uri: storeId,
        sizeBytes: stats.size,
        state: 'ACTIVE'
      };

    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }


  async deleteFile(storeName?: string) {
    if (!storeName) {
      return;
    }

    try {
      await this.client.fileSearchStores.delete({ name: storeName });
      this.logger.log(`Deleted FileSearchStore: ${storeName}`);
    } catch (error) {
      this.logger.warn(`Failed to delete FileSearchStore ${storeName}: ${(error as Error).message}`);
    }
  }

  async answerQuestionFromFile(options: { fileUri?: string; question: string; systemPrompt?: string }) {
    if (!options.fileUri) {
      throw new Error('fileUri (store name) is required to query file search');
    }

    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: options.question }],
        },
      ],
      config: {
        systemInstruction: options.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [options.fileUri],
            },
          },
        ],
      },
    });

    const text = response.text || '';
    return { text, model: this.modelName };
  }

  async retrieveContext(options: { fileUri?: string; query: string; maxSnippets?: number }) {
    if (!options.fileUri) {
      return [];
    }

    const maxSnippets = options.maxSnippets ?? 3;
    const prompt = `You are a retrieval assistant. Search the provided file store for: "${options.query}". Respond with JSON containing a "snippets" array. Each entry must have "score" (0-1) and "content" fields summarizing the most relevant passages. Limit to ${maxSnippets} snippets. Do not include any other text.`;

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [options.fileUri],
              },
            },
          ],
        },
      });

      const raw = response.text || '[]';
      const parsed = JSON.parse(raw);
      
      if (Array.isArray(parsed?.snippets)) {
        return parsed.snippets;
      }
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      this.logger.warn(`Failed to retrieve/parse context: ${(error as Error).message}`);
      return [];
    }
  }
}
