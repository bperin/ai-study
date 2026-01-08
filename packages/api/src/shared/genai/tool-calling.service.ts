import { Injectable } from '@nestjs/common';
import { TestsRepository } from '../../domain/study-tests/tests.repository';
import { EvalPlan } from './ai-study-plan.service';

@Injectable()
export class ToolCallingService {
  constructor(private readonly testsRepository: TestsRepository) {}

  async persistPlan(documentId: string, plan: EvalPlan): Promise<EvalPlan> {
    if (!plan.evals.length) {
      return plan;
    }

    const evals = await Promise.all(
      plan.evals.map(async (evalPlan) => {
        const createdEval = await this.testsRepository.createEval(
          documentId,
          evalPlan.title,
          '', // description
          evalPlan.difficulty
        );

        const items = await Promise.all(
          evalPlan.items.map((item) =>
            this.testsRepository.createEvalItem(
              createdEval.id,
              evalPlan.type,
              item.prompt,
              item.options,
              item.correctIdx,
              item.explanation,
              item.hint
            )
          )
        );

        return {
          id: createdEval.id,
          title: createdEval.title,
          difficulty: createdEval.difficulty,
          type: evalPlan.type,
          items: items.map((item) => ({
            id: item.id,
            prompt: item.prompt,
            options: item.options,
            correctIdx: item.correctIdx,
            explanation: item.explanation,
            hint: item.hint,
            hasImage: item.hasImage,
            imagePrompt: item.imagePrompt,
          })),
        };
      })
    );

    return {
      ...plan,
      evals,
    };
  }
}
