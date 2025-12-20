import { TestsRepository } from './tests.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestAttemptRecordDto } from './dto/create-test-attempt-record.dto';

describe('TestsRepository', () => {
  let repository: TestsRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      mcq: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      objective: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      testAttempt: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      userAnswer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    repository = new TestsRepository(prisma as PrismaService);
  });

  it('creates test attempts via Prisma', async () => {
    const dto = new CreateTestAttemptRecordDto();
    dto.userId = 'user';
    dto.pdfId = 'pdf';
    dto.total = 10;
    dto.score = 0;
    await repository.createAttempt(dto);
    expect(prisma.testAttempt.create).toHaveBeenCalled();
  });

  it('finds MCQs via Prisma', async () => {
    await repository.findMcqsByIds(['mcq-1']);
    expect(prisma.mcq.findMany).toHaveBeenCalledWith({ where: { id: { in: ['mcq-1'] } } });
  });
});
