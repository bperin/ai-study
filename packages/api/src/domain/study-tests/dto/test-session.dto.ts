export class TestSessionDto {
  id: string;
  userId: string;
  documentId: string;
  difficulty: string;
  requestedItems: number;
  evals: Array<{
    id: string;
    title: string;
    itemCount: number;
  }>;
  notes?: string;
  status: string;
  createdAt: Date;
}

export class TestSessionStateDto {
  attemptId: string;
  userId: string;
  answeredCount: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  startTime: Date;
  totalTimeSpent: number;
}
