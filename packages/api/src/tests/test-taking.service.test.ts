import { Test, TestingModule } from "@nestjs/testing";
import { TestTakingService } from "./test-taking.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

describe("TestTakingService", () => {
    let service: TestTakingService;
    let prisma: PrismaService;

    const mockPrisma = {
        testAttempt: {
            findFirst: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        mcq: {
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        userAnswer: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
    };

    const mockConfig = {
        get: jest.fn().mockReturnValue("test-api-key"),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TestTakingService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: ConfigService, useValue: mockConfig },
            ],
        }).compile();

        service = module.get<TestTakingService>(TestTakingService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("getOrStartSession", () => {
        it("should resume an existing attempt", async () => {
            const mockAttempt = {
                id: "attempt-1",
                userId: "user-1",
                pdfId: "pdf-1",
                startedAt: new Date(),
                answers: [],
            };

            mockPrisma.testAttempt.findFirst.mockResolvedValue(mockAttempt);
            mockPrisma.mcq.findMany.mockResolvedValue([]);

            const result = await service.getOrStartSession("user-1", "pdf-1");

            expect(result.attemptId).toBe("attempt-1");
            expect(mockPrisma.testAttempt.findFirst).toHaveBeenCalled();
            expect(mockPrisma.testAttempt.create).not.toHaveBeenCalled();
        });

        it("should create a new attempt if none exists", async () => {
            mockPrisma.testAttempt.findFirst.mockResolvedValue(null);
            mockPrisma.mcq.count.mockResolvedValue(10);
            mockPrisma.testAttempt.create.mockResolvedValue({
                id: "new-attempt",
                userId: "user-1",
                pdfId: "pdf-1",
                startedAt: new Date(),
                answers: [],
            });
            mockPrisma.mcq.findMany.mockResolvedValue([]);

            const result = await service.getOrStartSession("user-1", "pdf-1");

            expect(result.attemptId).toBe("new-attempt");
            expect(mockPrisma.testAttempt.create).toHaveBeenCalled();
        });
    });
});