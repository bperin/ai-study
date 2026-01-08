import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentIntentService } from '../services/document-intent.service';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';

describe('DocumentIntentService', () => {
  let service: DocumentIntentService;
  let artifactsService: ArtifactsService;
  let configService: ConfigService;

  // Mock response for the first generateContent call (intent analysis)
  const mockAnalysisResponse = {
    topics: ['Machine Learning Basics', 'Neural Networks', 'Deep Learning Applications'],
    concepts: ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning'],
    learningGaps: ['Mathematical Foundations', 'Advanced Optimization Techniques'],
  };

  // Mock response for the second generateContent call (intent builder)
  const mockStructuredIntents = {
    title: 'Machine Learning Fundamentals',
    intents: [
      {
        title: 'Understanding Supervised Learning',
        description: 'Learn the basics of supervised learning algorithms and their applications',
        difficulty: 'medium',
        questionCount: 3,
      },
      {
        title: 'Neural Network Architectures',
        description: 'Explore different neural network architectures and their use cases',
        difficulty: 'hard',
        questionCount: 4,
      },
      {
        title: 'Applications of Deep Learning',
        description: 'Discover real-world applications of deep learning technologies',
        difficulty: 'medium',
        questionCount: 3,
      },
    ],
  };

  // Mock for the ArtifactsService
  const mockArtifactsService = {
    createArtifact: jest.fn().mockImplementation((data) => {
      return {
        id: 'mock-artifact-id',
        ...data,
      };
    }),
    updateArtifact: jest.fn(),
    getDocumentIntents: jest.fn(),
  };

  // Mock for the ConfigService
  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-api-key'),
  };

  // Mock for GoogleGenAI
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });
  const mockGoogleGenAI = jest.fn().mockImplementation(() => {
    return {
      getGenerativeModel: mockGetGenerativeModel,
    };
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset the mock implementation for generateContent
    mockGenerateContent.mockReset();

    // First call returns the analysis response
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockAnalysisResponse),
        promptFeedback: { tokenCount: 120 },
      },
    }));

    // Second call returns the structured intents
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockStructuredIntents),
        promptFeedback: { tokenCount: 180 },
      },
    }));

    jest.mock('@google/genai', () => ({
      GoogleGenAI: mockGoogleGenAI,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentIntentService, { provide: ArtifactsService, useValue: mockArtifactsService }, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<DocumentIntentService>(DocumentIntentService);
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractDocumentIntents', () => {
    it('should extract intents from a document and create an artifact', async () => {
      // Call the service method
      const result = await service.extractDocumentIntents({
        documentId: 'doc-123',
        documentTitle: 'Machine Learning Guide',
        userId: 'user-456',
        fileSearchStoreName: 'test-file-store',
      });

      // Check that createArtifact was called with the correct parameters
      expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith({
        type: ArtifactType.INTENTS,
        status: ArtifactStatus.GENERATING,
        documentId: 'doc-123',
        userId: 'user-456',
        meta: expect.objectContaining({
          title: 'Machine Learning Guide',
          fileSearchStoreName: 'test-file-store',
          startTime: expect.any(String),
        }),
      });

      // Check that updateArtifact was called with the correct parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        'mock-artifact-id',
        expect.objectContaining({
          status: ArtifactStatus.READY,
          json: mockStructuredIntents,
          meta: expect.objectContaining({
            model: 'gemini-3-flash-preview',
            inputTokens: expect.any(Number),
            outputTokens: expect.any(Number),
            latencyMs: expect.any(Number),
            endTime: expect.any(String),
          }),
        }),
      );

      // Check that the result is the structured intents
      expect(result).toEqual(mockStructuredIntents);

      // Verify that generateContent was called twice with the correct parameters
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-3-flash-preview' });
    });

    it('should handle errors during intent extraction', async () => {
      // Reset the mock to throw an error
      mockGenerateContent.mockReset();
      mockGenerateContent.mockRejectedValueOnce(new Error('API error'));

      // Call the service method and expect it to throw
      await expect(
        service.extractDocumentIntents({
          documentId: 'doc-123',
          documentTitle: 'Machine Learning Guide',
          userId: 'user-456',
        }),
      ).rejects.toThrow('API error');

      // Check that updateArtifact was called with the correct error parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        'mock-artifact-id',
        expect.objectContaining({
          status: ArtifactStatus.FAILED,
          error: 'API error',
          meta: expect.objectContaining({
            endTime: expect.any(String),
            errorDetails: expect.any(String),
          }),
        }),
      );
    });

    it('should handle JSON parsing errors', async () => {
      // Reset the mock to return invalid JSON
      mockGenerateContent.mockReset();
      mockGenerateContent.mockImplementationOnce(async () => ({
        response: {
          text: () => 'Not valid JSON',
          promptFeedback: { tokenCount: 120 },
        },
      }));

      // Call the service method and expect it to throw
      await expect(
        service.extractDocumentIntents({
          documentId: 'doc-123',
          documentTitle: 'Machine Learning Guide',
          userId: 'user-456',
        }),
      ).rejects.toThrow('Failed to extract JSON from Gemini response');

      // Check that updateArtifact was called with the correct error parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        'mock-artifact-id',
        expect.objectContaining({
          status: ArtifactStatus.FAILED,
          error: 'Failed to extract JSON from Gemini response',
          meta: expect.objectContaining({
            endTime: expect.any(String),
            errorDetails: expect.any(String),
          }),
        }),
      );
    });
  });
});
