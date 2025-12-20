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
    await repository.createPdf('user-1', 'file.pdf');
    expect(prisma.pdf.create).toHaveBeenCalledWith({
      data: { filename: 'file.pdf', user: { connect: { id: 'user-1' } }, gcsPath: undefined, content: undefined },
    });
  });

  it('updates sessions via Prisma', async () => {
    await repository.updatePdfSession('session-1', 'completed');
    expect(prisma.pdfSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'completed' },
    });
  });
});
