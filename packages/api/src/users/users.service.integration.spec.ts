import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { UserRepository } from '../shared/repositories/user.repository';

describe('UsersService Integration', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let prismaService: PrismaService;
  let userRepository: UserRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        UserRepository,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    usersService = moduleFixture.get<UsersService>(UsersService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User CRUD Operations', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedpassword',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should find a user by id', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await usersService.findOne({ id: '1' });

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should create a new user', async () => {
      const createData = {
        email: 'new@example.com',
        password: 'hashedpassword',
        isAdmin: false,
      };

      jest.spyOn(prismaService.user, 'create').mockResolvedValue({
        ...mockUser,
        ...createData,
      });

      const result = await usersService.create(createData);

      expect(result).toEqual({ ...mockUser, ...createData });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should update a user', async () => {
      const updateData = { email: 'updated@example.com' };
      const updatedUser = { ...mockUser, ...updateData };

      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      const result = await usersService.update({
        where: { id: '1' },
        data: updateData,
      });

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
    });

    it('should find all users', async () => {
      const users = [mockUser];
      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue(users);

      const result = await usersService.findAll();

      expect(result).toEqual(users);
      expect(prismaService.user.findMany).toHaveBeenCalled();
    });
  });
});
