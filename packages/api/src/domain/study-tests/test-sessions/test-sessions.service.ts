import { Injectable, NotFoundException } from '@nestjs/common';
import { AiStudyPlanService } from '../../../shared/genai/ai-study-plan.service';
import { ToolCallingService } from '../../../shared/genai/tool-calling.service';
import { DocumentsService } from '../../documents/documents.service';
import { InMemorySessionStore } from './in-memory-session.store';
import { StudySessionSummary } from './interfaces/study-session.interface';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class TestSessionsService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly aiStudyPlanService: AiStudyPlanService,
    private readonly toolCallingService: ToolCallingService,
    private readonly sessionStore: InMemorySessionStore,
  ) {}

  async startSession(params: { userId: string; token: string; payload: StartSessionDto }): Promise<StudySessionSummary> {
    const document = await this.documentsService.registerLinkedDocument({
      userId: params.userId,
      filename: params.payload.filename,
      signedUrl: params.payload.signedPdfUrl,
    });

    const plan = this.aiStudyPlanService.buildPlan({
      description: params.payload.testDescription,
      difficulty: params.payload.difficulty,
      itemTarget: params.payload.cardTarget,
      includeImages: params.payload.includeImages || false,
    });

    const persistedPlan = await this.toolCallingService.persistPlan(document.id, plan);

    const session = this.sessionStore.create({
      userId: params.userId,
      token: params.token,
      documentId: document.id,
      difficulty: persistedPlan.difficulty,
      requestedItems: persistedPlan.requestedItems,
      evals: persistedPlan.evals.map((evalItem) => ({
        id: evalItem.id,
        title: evalItem.title,
        itemCount: evalItem.items.length,
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
