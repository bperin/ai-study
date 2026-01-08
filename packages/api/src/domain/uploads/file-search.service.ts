import { Injectable, Logger } from '@nestjs/common';
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

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set.');
    }

    this.client = new GoogleGenAI({ apiKey });
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const saKey = process.env.GOOGLE_CLOUD_SA_KEY;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const options: any = { projectId };

    if (saKey) {
      try {
        options.credentials = JSON.parse(saKey);
      } catch (e) {
        options.keyFilename = saKey;
      }
    }

    this.storage = new Storage(options);
    this.bucketName = process.env.GCP_BUCKET_NAME ?? 'missing-bucket';
  }

  async uploadFromGcs(gcsFilePath: string, displayName: string, existingStoreId?: string): Promise<FileSearchUploadResult> {
    const tempFilePath = path.join(os.tmpdir(), `gemini-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);

    try {
      this.logger.log(`Downloading ${gcsFilePath} from GCS to ${tempFilePath}`);
      await this.storage.bucket(this.bucketName).file(gcsFilePath).download({ destination: tempFilePath });
      const stats = fs.statSync(tempFilePath);

      this.logger.log(`Uploading ${displayName} to Gemini File API`);
      const uploadResponse = await this.client.files.upload({
        file: tempFilePath,
        config: { name: displayName },
      });
      const geminiFile = uploadResponse;
      this.logger.log(`Uploaded to Gemini File API: ${geminiFile.name}`);

      let storeId = existingStoreId;
      if (!storeId) {
        const fileSearchStore = await this.client.fileSearchStores.create({
          config: { displayName: `store-${displayName.replace(/[^a-zA-Z0-9_-]/g, '_')}` },
        });
        storeId = fileSearchStore.name;
        this.logger.log(`Created new FileSearchStore: ${storeId}`);
      } else {
        this.logger.log(`Using existing FileSearchStore: ${storeId}`);
      }

      let operation = await this.client.fileSearchStores.importFile({
        fileSearchStoreName: storeId,
        fileName: geminiFile.name,
      });
      this.logger.log(`Import operation started: ${operation.name}`);

      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        operation = await this.client.operations.get({ operation: (operation as any).name || operation });
      }

      if (operation.error) {
        throw new Error(`Import failed: ${JSON.stringify(operation.error)}`);
      }

      return {
        fileId: geminiFile.name,
        storeId,
        displayName,
        mimeType: 'application/pdf',
        uri: storeId,
        sizeBytes: stats.size,
        state: 'ACTIVE',
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
    const prompt = `You are a retrieval assistant. Search the provided file store for: \"${options.query}\". Respond with JSON containing a \"snippets\" array. Each entry must have \"score\" (0-1) and \"content\" fields summarizing the most relevant passages. Limit to ${maxSnippets} snippets. Do not include any other text.`;

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
