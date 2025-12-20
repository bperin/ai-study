import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { CreateUserRecordDto } from './dto/create-user-record.dto';
import { UpdateUserRecordDto } from './dto/update-user-record.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findOne(criteria: { id?: string; email?: string }): Promise<User | null> {
    if (criteria.id) {
      return this.usersRepository.findById(criteria.id);
    }
    if (criteria.email) {
      return this.usersRepository.findByEmail(criteria.email);
    }
    throw new Error('Must provide an id or email to find a user');
  }

  async create(data: CreateUserRecordDto): Promise<User> {
    return this.usersRepository.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      isAdmin: data.isAdmin,
      provider: data.provider,
    });
  }

  async update(id: string, data: UpdateUserRecordDto): Promise<User> {
    return this.usersRepository.updateUser(id, {
      email: data.email,
      password: data.password,
      name: data.name,
      isAdmin: data.isAdmin,
      provider: data.provider,
    });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.listAll();
  }
}
