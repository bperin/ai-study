import { Injectable, NotFoundException } from '@nestjs/common';
import { AiStudyPlanService } from '../../../shared/genai/ai-study-plan.service';
import { ToolCallingService } from '../../../shared/genai/tool-calling.service';
import { DocumentIngestService } from '../../pdf/pdf-ingest.service';
import { InMemorySessionStore } from './in-memory-session.store';
import { StudySessionSummary } from './interfaces/study-session.interface';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class TestSessionsService {
  constructor(
    private readonly pdfIngestService: DocumentIngestService,
    private readonly aiStudyPlanService: AiStudyPlanService,
    private readonly toolCallingService: ToolCallingService,
    private readonly sessionStore: InMemorySessionStore,
  ) {}

  async startSession(params: { userId: string; token: string; payload: StartSessionDto }): Promise<StudySessionSummary> {
    const pdf = await this.pdfIngestService.registerLinkedDocument({
      userId: params.userId,
      filename: params.payload.filename,
      signedUrl: params.payload.signedPdfUrl,
    });

    const plan = this.aiStudyPlanService.buildPlan({
      description: params.payload.testDescription,
      difficulty: params.payload.difficulty,
      cardTarget: params.payload.cardTarget,
    });

    const persistedPlan = await this.toolCallingService.persistPlan(pdf.id, plan);

    const session = this.sessionStore.create({
      userId: params.userId,
      token: params.token,
      documentId: pdf.id,
      difficulty: persistedPlan.difficulty,
      requestedCards: persistedPlan.requestedCards,
      objectives: persistedPlan.objectives.map((objective) => ({
        id: objective.id,
        title: objective.title,
        cardCount: objective.mcqs.length,
      })),
      notes: persistedPlan.notes,
    });

    this.sessionStore.updateStatus(session.id, 'persisted');
    return this.sessionStore.get(session.id) as StudySessionSummary;
  }

  getSession(sessionId: string): StudySessionSummary {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }
}
