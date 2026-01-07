import { DocumentsRepository } from './documents.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('DocumentsRepository', () => {
  let repository: DocumentsRepository;
  let prisma: { document: any; documentSession: any };

  beforeEach(() => {
    prisma = {
      document: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      documentSession: {
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    repository = new DocumentsRepository(prisma as unknown as PrismaService);
  });

  it('creates Documents via Prisma', async () => {
    await repository.createDocument('user-1', 'file.pdf');
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: { filename: 'file.pdf', user: { connect: { id: 'user-1' } }, storagePath: undefined, mimeType: undefined, content: undefined },
    });
  });

  it('updates sessions via Prisma', async () => {
    await repository.updateDocumentSession('session-1', 'completed');
    expect(prisma.documentSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'completed' },
    });
  });
});
