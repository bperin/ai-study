import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EvalPlanService } from '../services/eval-plan.service';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { EvalSessionsService } from '../../domain/eval-sessions/eval-sessions.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';

// Mock the GoogleGenAI class
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockImplementation(() => {
          return {
            generateContent: jest.fn().mockImplementation(async () => {
              return {
                response: {
                  text: () =>
                    JSON.stringify({
                      title: 'Test Evaluation',
                      description: 'A test evaluation plan',
                      topics: [
                        { name: 'Topic 1', weight: 0.6, questionCount: 6 },
                        { name: 'Topic 2', weight: 0.4, questionCount: 4 },
                      ],
                      questionTypes: [{ type: 'multiple_choice', count: 10 }],
                      difficulty: {
                        easy: 0.3,
                        medium: 0.5,
                        hard: 0.2,
                      },
                      estimatedTime: '20 minutes',
                      includeImages: true,
                      imageCount: 2,
                    }),
                  promptFeedback: {
                    tokenCount: 150,
                  },
                },
              };
            }),
          };
        }),
      };
    }),
  };
});

describe('EvalPlanService', () => {
  let service: EvalPlanService;
  let artifactsService: ArtifactsService;
  let evalSessionsService: EvalSessionsService;

  const mockArtifactsService = {
    createArtifact: jest.fn(),
    updateArtifact: jest.fn(),
    getDocumentIntents: jest.fn(),
  };

  const mockEvalSessionsService = {
    markSessionAsGenerating: jest.fn(),
    getSessionById: jest.fn(),
    updateSessionPlan: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-api-key'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvalPlanService,
        {
          provide: ArtifactsService,
          useValue: mockArtifactsService,
        },
        {
          provide: EvalSessionsService,
          useValue: mockEvalSessionsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EvalPlanService>(EvalPlanService);
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    evalSessionsService = module.get<EvalSessionsService>(EvalSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEvalPlan', () => {
    it('should generate an evaluation plan and update the session', async () => {
      // Mock the session and intents
      const mockSession = {
        id: 'session-id',
        difficulty: 'medium',
        totalItems: 10,
        includeImages: true,
        imageCount: 2,
        timeLimitMins: 20,
        userPreferences: { tone: 'friendly' },
      };

      const mockIntents = {
        topics: ['Topic 1', 'Topic 2'],
        concepts: ['Concept 1', 'Concept 2'],
      };

      // Mock the artifact
      const mockArtifact = {
        id: 'artifact-id',
        type: ArtifactType.SUMMARY,
        status: ArtifactStatus.GENERATING,
        documentId: 'doc-id',
        userId: 'user-id',
        meta: {
          sessionId: 'session-id',
          startTime: expect.any(String),
        },
      };

      // Set up the mocks
      mockEvalSessionsService.getSessionById.mockResolvedValue(mockSession);
      mockArtifactsService.getDocumentIntents.mockResolvedValue(mockIntents);
      mockArtifactsService.createArtifact.mockResolvedValue(mockArtifact);

      // Call the method
      await service.generateEvalPlan({
        sessionId: 'session-id',
        documentId: 'doc-id',
        userId: 'user-id',
      });

      // Verify that markSessionAsGenerating was called
      expect(mockEvalSessionsService.markSessionAsGenerating).toHaveBeenCalledWith('session-id');

      // Verify that createArtifact was called with the correct parameters
      expect(mockArtifactsService.createArtifact).toHaveBeenCalledWith({
        type: ArtifactType.SUMMARY,
        status: ArtifactStatus.GENERATING,
        documentId: 'doc-id',
        userId: 'user-id',
        meta: expect.objectContaining({
          sessionId: 'session-id',
          startTime: expect.any(String),
        }),
      });

      // Verify that getDocumentIntents was called
      expect(mockArtifactsService.getDocumentIntents).toHaveBeenCalledWith('doc-id');

      // Verify that updateArtifact was called with the correct parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        'artifact-id',
        expect.objectContaining({
          status: ArtifactStatus.READY,
          json: expect.any(Object),
          meta: expect.objectContaining({
            sessionId: 'session-id',
            model: 'gemini-3-flash-preview',
            inputTokens: expect.any(Number),
            outputTokens: expect.any(Number),
            latencyMs: expect.any(Number),
            endTime: expect.any(String),
          }),
        }),
      );

      // Verify that updateSessionPlan was called with the correct parameters
      expect(mockEvalSessionsService.updateSessionPlan).toHaveBeenCalledWith(
        'session-id',
        expect.objectContaining({
          title: 'Test Evaluation',
          description: 'A test evaluation plan',
          topics: expect.any(Array),
          questionTypes: expect.any(Array),
          difficulty: expect.any(Object),
          estimatedTime: '20 minutes',
          includeImages: true,
          imageCount: 2,
        }),
      );
    });

    it('should handle errors and mark the artifact as failed', async () => {
      // Mock the session
      const mockSession = {
        id: 'session-id',
        difficulty: 'medium',
        totalItems: 10,
        includeImages: true,
        imageCount: 2,
        timeLimitMins: 20,
        userPreferences: { tone: 'friendly' },
      };

      // Mock the artifact
      const mockArtifact = {
        id: 'artifact-id',
        type: ArtifactType.SUMMARY,
        status: ArtifactStatus.GENERATING,
        documentId: 'doc-id',
        userId: 'user-id',
        meta: {
          sessionId: 'session-id',
          startTime: expect.any(String),
        },
      };

      // Set up the mocks
      mockEvalSessionsService.getSessionById.mockResolvedValue(mockSession);
      mockArtifactsService.createArtifact.mockResolvedValue(mockArtifact);
      mockArtifactsService.getDocumentIntents.mockResolvedValue(null); // This will cause an error

      // Call the method and expect it to throw
      await expect(
        service.generateEvalPlan({
          sessionId: 'session-id',
          documentId: 'doc-id',
          userId: 'user-id',
        }),
      ).rejects.toThrow('No intents found for this document');

      // Verify that updateArtifact was called with the correct parameters
      expect(mockArtifactsService.updateArtifact).toHaveBeenCalledWith(
        'artifact-id',
        expect.objectContaining({
          status: ArtifactStatus.FAILED,
          error: 'No intents found for this document',
          meta: expect.objectContaining({
            sessionId: 'session-id',
            endTime: expect.any(String),
            errorDetails: expect.any(String),
          }),
        }),
      );
    });
  });
});
