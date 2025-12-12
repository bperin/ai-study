import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudyPlan } from './plan-types';

@Injectable()
export class ToolCallingService {
  private readonly logger = new Logger(ToolCallingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persistPlan(pdfId: string, plan: StudyPlan) {
    this.logger.log('Persisting AI study plan using tool-calling scaffold');

    const objectives = [];
    for (const objective of plan.objectives) {
      const createdObjective = await this.prisma.objective.create({
        data: {
          title: objective.title,
          difficulty: plan.difficulty,
          pdfId,
        },
      });

      const mcqs = await Promise.all(
        Array.from({ length: objective.cardCount }).map((_, index) =>
          this.prisma.mcq.create({
            data: {
              question: `Auto-generated card ${index + 1} for ${objective.title}`,
              options: ['Needs review', 'Draft answer A', 'Draft answer B', 'Draft answer C'],
              correctIdx: 0,
              objectiveId: createdObjective.id,
              explanation: plan.notes,
            },
          }),
        ),
      );

      objectives.push({
        ...createdObjective,
        mcqs,
      });
    }

    return {
      difficulty: plan.difficulty,
      requestedCards: plan.requestedCards,
      objectives,
      notes: plan.notes,
    };
  }
}
