import { Test, TestingModule } from '@nestjs/testing';
import { TestTakingService } from './test-taking.service';
import { ConfigService } from '@nestjs/config';
import { TestsRepository } from './tests.repository';
import { RetrieveService } from '../rag/services/retrieve.service';
import { PdfTextService } from '../pdfs/pdf-text.service';
import { GcsService } from '../pdfs/gcs.service';

describe('TestTakingService', () => {
  let service: TestTakingService;
  let testsRepository: TestsRepository;

  const mockTestsRepository = {
    findActiveAttempt: jest.fn(),
    countMcqsByPdfId: jest.fn(),
    createAttempt: jest.fn(),
    findMcqsByPdfId: jest.fn(),
  };

  const mockRetrieveService = {};

  const mockConfig = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  const mockPdfTextService = {
    extractText: jest.fn(),
  };

  const mockGcsService = {
    downloadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestTakingService, { provide: TestsRepository, useValue: mockTestsRepository }, { provide: ConfigService, useValue: mockConfig }, { provide: RetrieveService, useValue: mockRetrieveService }, { provide: PdfTextService, useValue: mockPdfTextService }, { provide: GcsService, useValue: mockGcsService }],
    }).compile();

    service = module.get<TestTakingService>(TestTakingService);
    testsRepository = module.get<TestsRepository>(TestsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrStartSession', () => {
    it('should resume an existing attempt', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        userId: 'user-1',
        pdfId: 'pdf-1',
        startedAt: new Date(),
        answers: [],
      };

      mockTestsRepository.findActiveAttempt.mockResolvedValue(mockAttempt);
      mockTestsRepository.findMcqsByPdfId.mockResolvedValue([]);

      const result = await service.getOrStartSession('user-1', 'pdf-1');

      expect(result.attemptId).toBe('attempt-1');
      expect(mockTestsRepository.findActiveAttempt).toHaveBeenCalled();
      expect(mockTestsRepository.createAttempt).not.toHaveBeenCalled();
    });

    it('should create a new attempt if none exists', async () => {
      mockTestsRepository.findActiveAttempt.mockResolvedValue(null);
      mockTestsRepository.countMcqsByPdfId.mockResolvedValue(10);
      mockTestsRepository.createAttempt.mockResolvedValue({
        id: 'new-attempt',
        userId: 'user-1',
        pdfId: 'pdf-1',
        startedAt: new Date(),
        answers: [],
      });
      mockTestsRepository.findMcqsByPdfId.mockResolvedValue([]);

      const result = await service.getOrStartSession('user-1', 'pdf-1');

      expect(result.attemptId).toBe('new-attempt');
      expect(mockTestsRepository.createAttempt).toHaveBeenCalled();
    });
  });
});
