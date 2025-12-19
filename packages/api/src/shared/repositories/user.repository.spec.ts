import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prismaService: PrismaService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedpassword',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const createData = {
        email: 'new@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      };
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await repository.create(createData);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updateData = { email: 'updated@example.com' };
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, ...updateData });

      const result = await repository.update('1', updateData);

      expect(result).toEqual({ ...mockUser, ...updateData });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
    });
  });

  describe('delete', () => {
    it('should delete and return the user', async () => {
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await repository.delete('1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('count', () => {
    it('should return the count of users', async () => {
      mockPrismaService.user.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: undefined,
      });
    });
  });
});
