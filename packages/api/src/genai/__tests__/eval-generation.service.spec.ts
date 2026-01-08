import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EvalGenerationService } from '../services/eval-generation.service';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';

describe('EvalGenerationService', () => {
  let service: EvalGenerationService;
  let artifactsService: ArtifactsService;
  let configService: ConfigService;

  // Mock document intents
  const mockDocumentIntents = {
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
    ],
  };

  // Mock evaluation plan
  const mockEvalPlan = {
    id: 'plan-123',
    title: 'Machine Learning Assessment',
    description: 'A comprehensive assessment of machine learning concepts',
    topics: [
      { name: 'Supervised Learning', weight: 0.6, questionCount: 6 },
      { name: 'Neural Networks', weight: 0.4, questionCount: 4 },
    ],
    questionTypes: [{ type: 'multiple_choice', count: 10 }],
    difficulty: {
      easy: 0.3,
      medium: 0.5,
      hard: 0.2,
    },
    estimatedTime: '30 minutes',
    includeImages: true,
    imageCount: 2,
  };

  // Mock generated evaluation
  const mockGeneratedEval = {
    title: 'Machine Learning Assessment',
    description: 'A comprehensive assessment of machine learning concepts',
    instructions: 'Answer all questions to the best of your ability.',
    rubric: {
      scoring: 'Each question is worth 1 point.',
      passingThreshold: 70,
    },
    items: [
      {
        type: 'multiple_choice',
        prompt: 'Which of the following is a supervised learning algorithm?',
        options: ['K-means clustering', 'Linear regression', 'Principal component analysis', 'Autoencoders'],
        correctIdx: 1,
        hint: 'Think about algorithms that use labeled data for training.',
        explanation: 'Linear regression is a supervised learning algorithm because it uses labeled data to predict a continuous output.',
        hasImage: false,
        imagePrompt: null,
        imageUrl: null,
        metadata: {
          difficulty: 'easy',
          topic: 'Supervised Learning',
          conceptsTested: ['Supervised Learning', 'Regression'],
        },
      },
      {
        type: 'multiple_choice',
        prompt: 'What is the purpose of activation functions in neural networks?',
        options: ['To initialize weights', 'To introduce non-linearity', 'To normalize inputs', 'To reduce overfitting'],
        correctIdx: 1,
        hint: 'Consider what would happen if a neural network only had linear operations.',
        explanation: 'Activation functions introduce non-linearity into the network, allowing it to learn complex patterns.',
        hasImage: true,
        imagePrompt: 'A diagram showing different activation functions (ReLU, sigmoid, tanh) and their graphs',
        imageUrl: null,
        metadata: {
          difficulty: 'medium',
          topic: 'Neural Networks',
          conceptsTested: ['Neural Networks', 'Activation Functions'],
        },
      },
    ],
  };

  // Mock for the ArtifactsService
  const mockArtifactsService = {
    createArtifact: jest.fn().mockImplementation((data) => {
      return {
        id: `mock-artifact-${Math.random().toString(36).substring(7)}`,
        ...data,
      };
    }),
    updateArtifact: jest.fn(),
    getDocumentIntents: jest.fn().mockResolvedValue(mockDocumentIntents),
  };

  // Mock for the ConfigService
  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-api-key'),
  };

  // Mock for GoogleGenAI
  const mockGenerateContent = jest.fn().mockImplementation(async () => ({
    response: {
      text: () => JSON.stringify(mockGeneratedEval),
      promptFeedback: { tokenCount: 250 },
    },
  }));

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

    jest.mock('@google/genai', () => ({
      GoogleGenAI: mockGoogleGenAI,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [EvalGenerationService, { provide: ArtifactsService, useValue: mockArtifactsService }, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<EvalGenerationService>(EvalGenerationService);
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEvaluation', () => {
    it('should generate an evaluation and create artifacts for items', async () => {
      // Call the service method
      const result = await service.generateEvaluation({
        evalId: 'eval-123',
        documentId: 'doc-123',
        userId: 'user-456',
        plan: mockEvalPlan,
      });

      // Check that createArtifact was called for the main evaluation
      expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith({
        type: ArtifactType.EVAL,
        status: ArtifactStatus.GENERATING,
        documentId: 'doc-123',
        evalId: 'eval-123',
        userId: 'user-456',
        meta: expect.objectContaining({
          planId: 'plan-123',
          startTime: expect.any(String),
        }),
      });

      // Check that getDocumentIntents was called
      expect(mockArtifactsService.getDocumentIntents).toHaveBeenCalledWith('doc-123');

      // Check that updateArtifact was called for the main evaluation
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: ArtifactStatus.READY,
          json: mockGeneratedEval,
          meta: expect.objectContaining({
            model: 'gemini-3-flash-preview',
            inputTokens: expect.any(Number),
            outputTokens: expect.any(Number),
            latencyMs: expect.any(Number),
            endTime: expect.any(String),
          }),
        }),
      );

      // Check that createArtifact was called for each item
      expect(mockArtifactsService.createArtifact).toHaveBeenCalledTimes(4); // 1 for eval + 2 for items + 1 for image

      // Check that createArtifact was called for the items
      expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ArtifactType.EVAL_ITEM,
          status: ArtifactStatus.READY,
          documentId: 'doc-123',
          evalId: 'eval-123',
          userId: 'user-456',
          json: mockGeneratedEval.items[0],
        }),
      );

      expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ArtifactType.EVAL_ITEM,
          status: ArtifactStatus.READY,
          documentId: 'doc-123',
          evalId: 'eval-123',
          userId: 'user-456',
          json: mockGeneratedEval.items[1],
        }),
      );

      // Check that createArtifact was called for the image
      expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ArtifactType.IMAGE,
          status: ArtifactStatus.PENDING,
          documentId: 'doc-123',
          evalId: 'eval-123',
          userId: 'user-456',
          text: mockGeneratedEval.items[1].imagePrompt,
        }),
      );

      // Check that the result is the generated evaluation
      expect(result).toEqual(mockGeneratedEval);
    });

    it('should handle errors when document intents are not found', async () => {
      // Mock getDocumentIntents to return null
      mockArtifactsService.getDocumentIntents.mockResolvedValueOnce(null);

      // Call the service method and expect it to throw
      await expect(
        service.generateEvaluation({
          evalId: 'eval-123',
          documentId: 'doc-123',
          userId: 'user-456',
          plan: mockEvalPlan,
        }),
      ).rejects.toThrow('No intents found for this document');

      // Check that updateArtifact was called with the correct error parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: ArtifactStatus.FAILED,
          error: 'No intents found for this document',
          meta: expect.objectContaining({
            endTime: expect.any(String),
            errorDetails: expect.any(String),
          }),
        }),
      );
    });

    it('should handle errors during evaluation generation', async () => {
      // Mock generateContent to throw an error
      mockGenerateContent.mockRejectedValueOnce(new Error('API error'));

      // Call the service method and expect it to throw
      await expect(
        service.generateEvaluation({
          evalId: 'eval-123',
          documentId: 'doc-123',
          userId: 'user-456',
          plan: mockEvalPlan,
        }),
      ).rejects.toThrow('API error');

      // Check that updateArtifact was called with the correct error parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        expect.any(String),
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
      // Mock generateContent to return invalid JSON
      mockGenerateContent.mockImplementationOnce(async () => ({
        response: {
          text: () => 'Not valid JSON',
          promptFeedback: { tokenCount: 120 },
        },
      }));

      // Call the service method and expect it to throw
      await expect(
        service.generateEvaluation({
          evalId: 'eval-123',
          documentId: 'doc-123',
          userId: 'user-456',
          plan: mockEvalPlan,
        }),
      ).rejects.toThrow('Failed to extract JSON from Gemini response');

      // Check that updateArtifact was called with the correct error parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        expect.any(String),
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
