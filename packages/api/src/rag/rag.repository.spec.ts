import { RagRepository } from './rag.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('RagRepository', () => {
  let repository: RagRepository;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      document: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      chunk: {
        create: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      queryLog: {
        create: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };
    repository = new RagRepository(prisma as PrismaService);
  });

  it('creates documents via Prisma', async () => {
    await repository.createDocumentRecord({ title: 'Doc', sourceType: 'text', mimeType: 'text/plain', status: 'PROCESSING' });
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: { title: 'Doc', sourceType: 'text', mimeType: 'text/plain', status: 'PROCESSING' },
    });
  });

  it('handles vector searches via Prisma raw query', async () => {
    await repository.vectorSearch('[0.1,0.2]', 'doc-1', 5);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
  });
});
