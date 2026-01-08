import { Injectable } from '@nestjs/common';

export interface EvalPlanItem {
  id?: string;
  title: string;
  difficulty: string;
  type: string;
  items: Array<{
    prompt: string;
    options: string[];
    correctIdx: number;
    explanation?: string | null;
    hint?: string | null;
    hasImage?: boolean;
    imagePrompt?: string | null;
  }>;
}

export interface EvalPlan {
  difficulty: string;
  requestedItems: number;
  includeImages: boolean;
  evals: EvalPlanItem[];
  notes?: string;
}

@Injectable()
export class AiStudyPlanService {
  buildPlan(params: { description: string; difficulty: string; itemTarget: number; includeImages?: boolean }): EvalPlan {
    const difficulty = params.difficulty || 'medium';
    const requestedItems = Math.max(0, params.itemTarget || 0);
    const includeImages = params.includeImages || false;
    const description = params.description?.trim();
    const title = description ? `Focus: ${description}` : 'Evaluation plan';

    return {
      difficulty,
      requestedItems,
      includeImages,
      evals: [
        {
          title,
          difficulty,
          type: 'multiple_choice',
          items: [],
        },
      ],
    };
  }
}
