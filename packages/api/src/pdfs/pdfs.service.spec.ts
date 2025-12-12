import { Test, TestingModule } from '@nestjs/testing';
import { PdfsService } from './pdfs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ParallelGenerationService } from './parallel-generation.service';
import { NotFoundException } from '@nestjs/common';

describe('PdfsService', () => {
    let service: PdfsService;
    let prismaService: PrismaService;
    let parallelGenerationService: ParallelGenerationService;

    const mockPrismaService = {
        pdf: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        objective: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        mcq: {
            deleteMany: jest.fn(),
        },
        testAttempt: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
        },
        userAnswer: {
            deleteMany: jest.fn(),
        },
        pdfSession: {
            deleteMany: jest.fn(),
        },
    };

    const mockParallelGenerationService = {
        analyzeTestResults: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PdfsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: ParallelGenerationService,
                    useValue: mockParallelGenerationService,
                },
            ],
        }).compile();

        service = module.get<PdfsService>(PdfsService);
        prismaService = module.get<PrismaService>(PrismaService);
        parallelGenerationService = module.get<ParallelGenerationService>(ParallelGenerationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('listPdfs', () => {
        it('should return array of PDFs for a user', async () => {
            const mockPdfs = [
                { id: '1', filename: 'test1.pdf', userId: 'user1' },
                { id: '2', filename: 'test2.pdf', userId: 'user1' },
            ];

            mockPrismaService.pdf.findMany.mockResolvedValue(mockPdfs);

            const result = await service.listPdfs('user1');

            expect(result).toEqual(mockPdfs);
            expect(mockPrismaService.pdf.findMany).toHaveBeenCalledWith({
                where: { userId: 'user1' },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should return empty array if user has no PDFs', async () => {
            mockPrismaService.pdf.findMany.mockResolvedValue([]);

            const result = await service.listPdfs('user1');

            expect(result).toEqual([]);
        });
    });

    describe('getObjectives', () => {
        it('should return objectives with MCQs for a PDF', async () => {
            const mockObjectives = [
                {
                    id: '1',
                    title: 'Test Objective',
                    mcqs: [
                        { id: 'q1', question: 'Question 1' },
                        { id: 'q2', question: 'Question 2' },
                    ],
                },
            ];

            mockPrismaService.objective.findMany.mockResolvedValue(mockObjectives);

            const result = await service.getObjectives('pdf1');

            expect(result).toEqual(mockObjectives);
            expect(mockPrismaService.objective.findMany).toHaveBeenCalledWith({
                where: { pdfId: 'pdf1' },
                include: { mcqs: true },
            });
        });
    });

    describe('startAttempt', () => {
        it('should create a new test attempt', async () => {
            const mockAttempt = {
                id: 'attempt1',
                pdfId: 'pdf1',
                userId: 'user1',
                startedAt: new Date(),
            };

            mockPrismaService.testAttempt.create.mockResolvedValue(mockAttempt);

            const result = await service.startAttempt('pdf1', 'user1');

            expect(result).toHaveProperty('attemptId', 'attempt1');
            expect(result).toHaveProperty('pdfId', 'pdf1');
            expect(result).toHaveProperty('startedAt');
        });
    });

    describe('submitTest', () => {
        it('should submit test and return analysis', async () => {
            const mockAttempt = {
                id: 'attempt1',
                pdfId: 'pdf1',
                userId: 'user1',
            };

            const mockAnalysis = {
                summary: 'Good job!',
                weakAreas: ['Topic 1'],
                studyStrategies: ['Review Topic 1'],
            };

            mockPrismaService.testAttempt.findUnique.mockResolvedValue(mockAttempt);
            mockParallelGenerationService.analyzeTestResults.mockResolvedValue(mockAnalysis);
            mockPrismaService.testAttempt.update.mockResolvedValue(mockAttempt);

            const result = await service.submitTest('attempt1', 8, 10, []);

            expect(result).toHaveProperty('attemptId', 'attempt1');
            expect(result).toHaveProperty('summary');
            expect(mockPrismaService.testAttempt.update).toHaveBeenCalled();
        });

        it('should throw NotFoundException if attempt not found', async () => {
            mockPrismaService.testAttempt.findUnique.mockResolvedValue(null);

            await expect(service.submitTest('invalid', 8, 10, [])).rejects.toThrow(NotFoundException);
        });

        it('should use fallback analysis if AI fails', async () => {
            const mockAttempt = {
                id: 'attempt1',
                pdfId: 'pdf1',
                userId: 'user1',
            };

            mockPrismaService.testAttempt.findUnique.mockResolvedValue(mockAttempt);
            mockParallelGenerationService.analyzeTestResults.mockRejectedValue(new Error('AI failed'));
            mockPrismaService.testAttempt.update.mockResolvedValue(mockAttempt);

            const result = await service.submitTest('attempt1', 8, 10, []);

            expect(result).toHaveProperty('summary');
            expect(result.summary).toContain('8 out of 10');
        });
    });

    describe('deletePdf', () => {
        it('should delete PDF and all associated data', async () => {
            const mockPdf = {
                id: 'pdf1',
                filename: 'test.pdf',
            };

            mockPrismaService.pdf.findUnique.mockResolvedValue(mockPdf);
            mockPrismaService.userAnswer.deleteMany.mockResolvedValue({ count: 5 });
            mockPrismaService.testAttempt.deleteMany.mockResolvedValue({ count: 3 });
            mockPrismaService.mcq.deleteMany.mockResolvedValue({ count: 20 });
            mockPrismaService.objective.deleteMany.mockResolvedValue({ count: 5 });
            mockPrismaService.pdfSession.deleteMany.mockResolvedValue({ count: 2 });
            mockPrismaService.pdf.delete.mockResolvedValue(mockPdf);

            const result = await service.deletePdf('pdf1');

            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('pdfId', 'pdf1');
            expect(result).toHaveProperty('filename', 'test.pdf');

            // Verify cascade delete order
            expect(mockPrismaService.userAnswer.deleteMany).toHaveBeenCalled();
            expect(mockPrismaService.testAttempt.deleteMany).toHaveBeenCalled();
            expect(mockPrismaService.mcq.deleteMany).toHaveBeenCalled();
            expect(mockPrismaService.objective.deleteMany).toHaveBeenCalled();
            expect(mockPrismaService.pdfSession.deleteMany).toHaveBeenCalled();
            expect(mockPrismaService.pdf.delete).toHaveBeenCalled();
        });

        it('should throw NotFoundException if PDF not found', async () => {
            mockPrismaService.pdf.findUnique.mockResolvedValue(null);

            await expect(service.deletePdf('invalid')).rejects.toThrow(NotFoundException);
        });
    });
});
