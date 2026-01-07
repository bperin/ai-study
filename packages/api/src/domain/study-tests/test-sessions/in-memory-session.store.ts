import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StudySessionSummary } from './interfaces/study-session.interface';

@Injectable()
export class InMemorySessionStore {
  private readonly sessions = new Map<string, StudySessionSummary>();

  create(session: Omit<StudySessionSummary, 'id' | 'createdAt' | 'status'>): StudySessionSummary {
    const id = randomUUID();
    const createdAt = new Date();
    const summary: StudySessionSummary = {
      id,
      createdAt,
      status: 'pending',
      ...session,
    };
    this.sessions.set(id, summary);
    return summary;
  }

  updateStatus(id: string, status: StudySessionSummary['status']): StudySessionSummary | null {
    const existing = this.sessions.get(id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, status };
    this.sessions.set(id, updated);
    return updated;
  }

  get(id: string): StudySessionSummary | null {
    return this.sessions.get(id) || null;
  }
}
