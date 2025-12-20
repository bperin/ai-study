import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserRecordDto } from './dto/create-user-record.dto';
import { UpdateUserRecordDto } from './dto/update-user-record.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  listAll(): Promise<User[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createUser(data: CreateUserRecordDto): Promise<User> {
    return this.prisma.user.create({ data });
  }

  updateUser(id: string, data: UpdateUserRecordDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
