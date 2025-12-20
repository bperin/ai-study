import { PdfsRepository } from './pdfs.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('PdfsRepository', () => {
  let repository: PdfsRepository;
  let prisma: { pdf: any; pdfSession: any };

  beforeEach(() => {
    prisma = {
      pdf: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      pdfSession: {
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    repository = new PdfsRepository(prisma as unknown as PrismaService);
  });

  it('creates PDFs via Prisma', async () => {
    await repository.createPdf({ userId: 'user-1', filename: 'file.pdf' } as any);
    expect(prisma.pdf.create).toHaveBeenCalledWith({
      data: { filename: 'file.pdf', userId: 'user-1' },
    });
  });

  it('updates sessions via Prisma', async () => {
    await repository.updatePdfSession('session-1', { status: 'completed' } as any);
    expect(prisma.pdfSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'completed' },
    });
  });
});
