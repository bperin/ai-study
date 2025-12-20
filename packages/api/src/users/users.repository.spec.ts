import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: { user: any };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new UsersRepository(prisma as unknown as PrismaService);
  });

  it('fetches users by id', async () => {
    await repository.findById('user-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('creates users with the expected payload', async () => {
    await repository.createUser('test@example.com', 'hash');
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { email: 'test@example.com', password: 'hash' } });
  });
});
