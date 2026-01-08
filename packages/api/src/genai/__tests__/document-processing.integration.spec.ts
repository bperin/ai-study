import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentIntentService } from '../services/document-intent.service';
import { EvalPlanService } from '../services/eval-plan.service';
import { EvalGenerationService } from '../services/eval-generation.service';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { EvalSessionsService } from '../../domain/eval-sessions/eval-sessions.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';

/**
 * This integration test simulates the entire document processing pipeline:
 * 1. Document intent extraction
 * 2. Evaluation plan generation
 * 3. Evaluation generation
 */
describe('Document Processing Pipeline Integration', () => {
  let documentIntentService: DocumentIntentService;
  let evalPlanService: EvalPlanService;
  let evalGenerationService: EvalGenerationService;
  let artifactsService: ArtifactsService;
  let evalSessionsService: EvalSessionsService;

  // Mock document data
  const documentId = 'doc-123';
  const documentTitle = 'Machine Learning Guide';
  const userId = 'user-456';
  const fileSearchStoreName = 'test-file-store';

  // Mock session data
  const sessionId = 'session-123';
  const mockSession = {
    id: sessionId,
    difficulty: 'medium',
    totalItems: 10,
    includeImages: true,
    imageCount: 2,
    timeLimitMins: 20,
    userPreferences: { tone: 'friendly' },
  };

  // Mock evaluation data
  const evalId = 'eval-123';

  // Mock intents response
  const mockIntents = {
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

  // Mock plan response
  const mockPlan = {
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

  // Mock evaluation response
  const mockEvaluation = {
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
    getDocumentIntents: jest.fn().mockResolvedValue(mockIntents),
  };

  // Mock for the EvalSessionsService
  const mockEvalSessionsService = {
    markSessionAsGenerating: jest.fn(),
    getSessionById: jest.fn().mockResolvedValue(mockSession),
    updateSessionPlan: jest.fn(),
  };

  // Mock for the ConfigService
  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-api-key'),
  };

  // Mock for GoogleGenAI
  const mockGenerateContent = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset the mock implementation for generateContent
    mockGenerateContent.mockReset();

    // First call (intent analysis) returns the intents
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockIntents),
        promptFeedback: { tokenCount: 150 },
      },
    }));

    // Second call (intent builder) returns the structured intents
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockIntents),
        promptFeedback: { tokenCount: 180 },
      },
    }));

    // Third call (plan generation) returns the plan
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockPlan),
        promptFeedback: { tokenCount: 200 },
      },
    }));

    // Fourth call (evaluation generation) returns the evaluation
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockEvaluation),
        promptFeedback: { tokenCount: 300 },
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

    jest.mock('@google/genai', () => ({
      GoogleGenAI: mockGoogleGenAI,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentIntentService, EvalPlanService, EvalGenerationService, { provide: ArtifactsService, useValue: mockArtifactsService }, { provide: EvalSessionsService, useValue: mockEvalSessionsService }, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    documentIntentService = module.get<DocumentIntentService>(DocumentIntentService);
    evalPlanService = module.get<EvalPlanService>(EvalPlanService);
    evalGenerationService = module.get<EvalGenerationService>(EvalGenerationService);
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    evalSessionsService = module.get<EvalSessionsService>(EvalSessionsService);
  });

  it('should process a document through the entire pipeline', async () => {
    // Step 1: Extract document intents
    const intents = await documentIntentService.extractDocumentIntents({
      documentId,
      documentTitle,
      userId,
      fileSearchStoreName,
    });

    // Verify intents were extracted
    expect(intents).toEqual(mockIntents);
    expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ArtifactType.INTENTS,
        documentId,
        userId,
      }),
    );
    expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: ArtifactStatus.READY,
        json: mockIntents,
      }),
    );

    // Step 2: Generate evaluation plan
    const plan = await evalPlanService.generateEvalPlan({
      sessionId,
      documentId,
      userId,
    });

    // Verify plan was generated
    expect(plan).toEqual(mockPlan);
    expect(mockEvalSessionsService.markSessionAsGenerating).toHaveBeenCalledWith(sessionId);
    expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ArtifactType.SUMMARY,
        documentId,
        userId,
        meta: expect.objectContaining({
          sessionId,
        }),
      }),
    );
    expect(mockEvalSessionsService.updateSessionPlan).toHaveBeenCalledWith(sessionId, mockPlan);

    // Step 3: Generate evaluation
    const evaluation = await evalGenerationService.generateEvaluation({
      evalId,
      documentId,
      userId,
      plan: mockPlan,
    });

    // Verify evaluation was generated
    expect(evaluation).toEqual(mockEvaluation);
    expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ArtifactType.EVAL,
        documentId,
        evalId,
        userId,
      }),
    );
    expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: ArtifactStatus.READY,
        json: mockEvaluation,
      }),
    );

    // Verify that createArtifact was called for the evaluation item
    expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ArtifactType.EVAL_ITEM,
        documentId,
        evalId,
        userId,
        json: mockEvaluation.items[0],
      }),
    );

    // Verify the total number of artifacts created
    // 1 for intents + 1 for plan + 1 for evaluation + 1 for evaluation item
    expect(mockArtifactsService.createArtifact).toHaveBeenCalledTimes(4);
  });

  it('should handle errors in the pipeline', async () => {
    // Reset the mock to throw an error during intent extraction
    mockGenerateContent.mockReset();
    mockGenerateContent.mockRejectedValueOnce(new Error('API error during intent extraction'));

    // Step 1: Extract document intents (should fail)
    await expect(
      documentIntentService.extractDocumentIntents({
        documentId,
        documentTitle,
        userId,
        fileSearchStoreName,
      }),
    ).rejects.toThrow('API error during intent extraction');

    // Verify that the artifact was marked as failed
    expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: ArtifactStatus.FAILED,
        error: 'API error during intent extraction',
      }),
    );

    // Reset the mock for the next test
    mockGenerateContent.mockReset();
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockIntents),
        promptFeedback: { tokenCount: 150 },
      },
    }));
    mockGenerateContent.mockImplementationOnce(async () => ({
      response: {
        text: () => JSON.stringify(mockIntents),
        promptFeedback: { tokenCount: 180 },
      },
    }));
    mockGenerateContent.mockRejectedValueOnce(new Error('API error during plan generation'));

    // Step 1: Extract document intents (should succeed)
    await documentIntentService.extractDocumentIntents({
      documentId,
      documentTitle,
      userId,
      fileSearchStoreName,
    });

    // Step 2: Generate evaluation plan (should fail)
    await expect(
      evalPlanService.generateEvalPlan({
        sessionId,
        documentId,
        userId,
      }),
    ).rejects.toThrow('API error during plan generation');

    // Verify that the artifact was marked as failed
    expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: ArtifactStatus.FAILED,
        error: 'API error during plan generation',
      }),
    );
  });
});
