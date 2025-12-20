import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

  createUser(email: string, password: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        password,
        isAdmin: false,
      },
    });
  }

  updateUser(id: string, email?: string, password?: string, name?: string, isAdmin?: boolean, provider?: string | null): Promise<User> {
    const payload: Record<string, any> = {};
    if (email !== undefined) payload.email = email;
    if (password !== undefined) payload.password = password;
    if (name !== undefined) payload.name = name;
    if (isAdmin !== undefined) payload.isAdmin = isAdmin;
    if (provider !== undefined) payload.provider = provider;

    return this.prisma.user.update({ where: { id }, data: payload });
  }

  update(params: { where: Prisma.UserWhereUniqueInput; data: Prisma.UserUpdateInput }): Promise<User> {
    return this.prisma.user.update(params);
  }
}
