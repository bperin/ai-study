import { Injectable } from '@nestjs/common';
import { TestsRepository } from '../../domain/study-tests/tests.repository';
import { StudyPlan } from './ai-study-plan.service';

@Injectable()
export class ToolCallingService {
  constructor(private readonly testsRepository: TestsRepository) {}

  async persistPlan(documentId: string, plan: StudyPlan): Promise<StudyPlan> {
    if (!plan.objectives.length) {
      return plan;
    }

    const objectives = await Promise.all(plan.objectives.map((objective) => this.testsRepository.createObjective(documentId, objective.title, objective.difficulty, objective.mcqs)));

    return {
      ...plan,
      objectives: objectives.map((objective) => ({
        id: objective.id,
        title: objective.title,
        difficulty: objective.difficulty,
        mcqs: objective.mcqs,
      })),
    };
  }
}
