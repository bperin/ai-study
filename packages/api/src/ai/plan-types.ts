export interface PlannedObjective {
  title: string;
  cardCount: number;
}

export interface StudyPlan {
  difficulty: string;
  requestedCards: number;
  objectives: PlannedObjective[];
  notes: string;
}
