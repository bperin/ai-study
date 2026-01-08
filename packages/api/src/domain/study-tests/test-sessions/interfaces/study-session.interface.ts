export interface StudySessionSummary {
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
