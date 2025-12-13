export type SessionStatus = "pending" | "ready" | "persisted";

export interface StudySessionSummary {
    id: string;
    userId: string;
    token: string;
    pdfId: string;
    createdAt: Date;
    status: SessionStatus;
    difficulty: string;
    requestedCards: number;
    objectives: Array<{ id: string; title: string; cardCount: number }>;
    notes?: string;
}
