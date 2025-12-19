import { Injectable } from '@nestjs/common';
import { Mcq, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class McqRepository implements BaseRepository<Mcq, Prisma.McqCreateInput, Prisma.McqUpdateInput, Prisma.McqWhereInput> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Mcq | null> {
    return this.prisma.mcq.findUnique({
      where: { id },
    });
  }

  async findByObjectiveId(objectiveId: string): Promise<Mcq[]> {
    return this.prisma.mcq.findMany({
      where: { objectiveId },
    });
  }

  async findByPdfId(pdfId: string): Promise<Mcq[]> {
    return this.prisma.mcq.findMany({
      where: { objective: { pdfId } },
      include: { objective: true },
    });
  }

  async countByPdfId(pdfId: string): Promise<number> {
    return this.prisma.mcq.count({
      where: { objective: { pdfId } },
    });
  }

  async findMany(where?: Prisma.McqWhereInput, skip?: number, take?: number): Promise<Mcq[]> {
    return this.prisma.mcq.findMany({
      where,
      skip,
      take,
    });
  }

  async create(data: Prisma.McqCreateInput): Promise<Mcq> {
    return this.prisma.mcq.create({
      data,
    });
  }

  async update(id: string, data: Prisma.McqUpdateInput): Promise<Mcq> {
    return this.prisma.mcq.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Mcq> {
    return this.prisma.mcq.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.McqWhereInput): Promise<number> {
    return this.prisma.mcq.count({
      where,
    });
  }

  async findWithObjectives(pdfId: string): Promise<any[]> {
    return this.prisma.mcq.findMany({
      where: { objective: { pdfId } },
      include: { objective: true },
    });
  }

  async findByIdWithObjective(id: string): Promise<any> {
    return this.prisma.mcq.findUnique({
      where: { id },
      include: { 
        objective: {
          include: {
            pdf: true
          }
        }
      },
    });
  }

  async findRandomByPdfId(pdfId: string, limit: number): Promise<Mcq[]> {
    // Note: This is a simplified random selection. For better randomization in production,
    // consider using raw SQL with ORDER BY RANDOM() or similar database-specific functions
    const totalCount = await this.countByPdfId(pdfId);
    const skip = Math.floor(Math.random() * Math.max(0, totalCount - limit));
    
    return this.prisma.mcq.findMany({
      where: { objective: { pdfId } },
      include: { objective: true },
      skip,
      take: limit,
    });
  }
}
