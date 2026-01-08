import { Injectable } from '@nestjs/common';

export interface StudyPlanObjective {
  id?: string;
  title: string;
  difficulty: string;
  mcqs: Array<{
    question: string;
    options: string[];
    correctIdx: number;
    explanation?: string | null;
    hint?: string | null;
  }>;
}

export interface StudyPlan {
  difficulty: string;
  requestedCards: number;
  objectives: StudyPlanObjective[];
  notes?: string;
}

@Injectable()
export class AiStudyPlanService {
  buildPlan(params: { description: string; difficulty: string; cardTarget: number }): StudyPlan {
    const difficulty = params.difficulty || 'medium';
    const requestedCards = Math.max(0, params.cardTarget || 0);
    const description = params.description?.trim();
    const title = description ? `Focus: ${description}` : 'Study plan';

    return {
      difficulty,
      requestedCards,
      objectives: [
        {
          title,
          difficulty,
          mcqs: [],
        },
      ],
    };
  }
}
