import { Injectable } from '@nestjs/common';
import { PromptTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';
import { FindPromptTemplatesDto } from './dto/find-prompt-templates.dto';

@Injectable()
export class PromptTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePromptTemplateDto): Promise<PromptTemplate> {
    return this.prisma.promptTemplate.create({
      data: {
        key: data.key,
        version: data.version || 1,
        isActive: data.isActive || false,
        title: data.title,
        description: data.description,
        template: data.template,
        metadata: data.metadata as Prisma.JsonValue,
        createdBy: data.createdBy,
      },
    });
  }

  async findById(id: string): Promise<PromptTemplate | null> {
    return this.prisma.promptTemplate.findUnique({
      where: { id },
    });
  }

  async findByKey(key: string): Promise<PromptTemplate[]> {
    return this.prisma.promptTemplate.findMany({
      where: { key },
      orderBy: { version: 'desc' },
    });
  }

  async findActiveByKey(key: string): Promise<PromptTemplate | null> {
    return this.prisma.promptTemplate.findFirst({
      where: {
        key,
        isActive: true,
      },
    });
  }

  async findByKeyAndVersion(key: string, version: number): Promise<PromptTemplate | null> {
    return this.prisma.promptTemplate.findUnique({
      where: {
        key_version: {
          key,
          version,
        },
      },
    });
  }

  async update(id: string, data: UpdatePromptTemplateDto): Promise<PromptTemplate> {
    return this.prisma.promptTemplate.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        template: data.template,
        metadata: data.metadata as Prisma.JsonValue,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<PromptTemplate> {
    return this.prisma.promptTemplate.delete({
      where: { id },
    });
  }

  async findMany(options: FindPromptTemplatesDto): Promise<PromptTemplate[]> {
    const where: Prisma.PromptTemplateWhereInput = {};

    if (options.key) where.key = options.key;
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.createdBy) where.createdBy = options.createdBy;

    return this.prisma.promptTemplate.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });
  }

  async getNextVersion(key: string): Promise<number> {
    const latest = await this.prisma.promptTemplate.findFirst({
      where: { key },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version || 0) + 1;
  }

  async activateVersion(key: string, version: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Deactivate all versions of this key
      await tx.promptTemplate.updateMany({
        where: { key },
        data: { isActive: false },
      });

      // Activate the specified version
      await tx.promptTemplate.update({
        where: {
          key_version: {
            key,
            version,
          },
        },
        data: { isActive: true },
      });
    });
  }

  async deactivateAll(key: string): Promise<void> {
    await this.prisma.promptTemplate.updateMany({
      where: { key },
      data: { isActive: false },
    });
  }
}
