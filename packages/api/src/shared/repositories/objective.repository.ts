import { Injectable } from '@nestjs/common';
import { Objective, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class ObjectiveRepository implements BaseRepository<Objective, Prisma.ObjectiveCreateInput, Prisma.ObjectiveUpdateInput, Prisma.ObjectiveWhereInput> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Objective | null> {
    return this.prisma.objective.findUnique({
      where: { id },
    });
  }

  async findByPdfId(pdfId: string): Promise<any[]> {
    return this.prisma.objective.findMany({
      where: { pdfId },
      include: {
        _count: {
          select: { mcqs: true },
        },
      },
    });
  }

  async findWithMcqs(id: string): Promise<any> {
    return this.prisma.objective.findUnique({
      where: { id },
      include: {
        mcqs: true,
      },
    });
  }

  async findByPdfIdWithMcqs(pdfId: string): Promise<any[]> {
    return this.prisma.objective.findMany({
      where: { pdfId },
      include: {
        mcqs: true,
      },
    });
  }

  async findMany(where?: Prisma.ObjectiveWhereInput, skip?: number, take?: number): Promise<Objective[]> {
    return this.prisma.objective.findMany({
      where,
      skip,
      take,
    });
  }

  async create(data: Prisma.ObjectiveCreateInput): Promise<Objective> {
    return this.prisma.objective.create({
      data,
    });
  }

  async createWithMcqs(data: Prisma.ObjectiveCreateInput): Promise<Objective & { mcqs: any[] }> {
    return this.prisma.objective.create({
      data,
      include: {
        mcqs: true,
      },
    });
  }

  async update(id: string, data: Prisma.ObjectiveUpdateInput): Promise<Objective> {
    return this.prisma.objective.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Objective> {
    return this.prisma.objective.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.ObjectiveWhereInput): Promise<number> {
    return this.prisma.objective.count({
      where,
    });
  }

  async countByPdfId(pdfId: string): Promise<number> {
    return this.prisma.objective.count({
      where: { pdfId },
    });
  }

  async deleteMcqsByPdfId(pdfId: string): Promise<number> {
    const result = await this.prisma.mcq.deleteMany({
      where: { objective: { pdfId } },
    });
    return result.count;
  }
}
