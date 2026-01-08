import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
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
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        isAdmin: data.isAdmin ?? false,
      },
    });
  }

  updateUser(id: string, data: UpdateUserRecordDto): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        password: data.password,
        isAdmin: data.isAdmin,
      },
    });
  }
}
