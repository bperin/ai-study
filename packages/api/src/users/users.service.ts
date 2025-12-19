import { Injectable, Inject } from '@nestjs/common';
import { UserRepository } from '../shared/repositories/user.repository';
import { User, Prisma } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async findOne(userWhereUniqueInput: Prisma.UserWhereUniqueInput): Promise<User | null> {
    this.logger.info('Finding user', { where: userWhereUniqueInput });
    
    if (userWhereUniqueInput.id) {
      return this.userRepository.findById(userWhereUniqueInput.id);
    }
    
    if (userWhereUniqueInput.email) {
      return this.userRepository.findByEmail(userWhereUniqueInput.email);
    }
    
    return null;
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    this.logger.info('Creating new user', { email: data.email });
    return this.userRepository.create(data);
  }

  async update(params: { where: Prisma.UserWhereUniqueInput; data: Prisma.UserUpdateInput }): Promise<User> {
    const { where, data } = params;
    this.logger.info('Updating user', { where, data });
    
    if (!where.id) {
      throw new Error('User ID is required for updates');
    }
    
    return this.userRepository.update(where.id, data);
  }

  async findAll(): Promise<User[]> {
    this.logger.info('Finding all users');
    return this.userRepository.findMany();
  }
}
