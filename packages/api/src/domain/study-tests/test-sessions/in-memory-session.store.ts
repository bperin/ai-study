import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InMemorySessionStore {
  private sessions: Map<string, any> = new Map();

  create(data: {
    userId: string;
    token: string;
    documentId: string;
    difficulty: string;
    requestedItems: number;
    evals: Array<{
      id: string;
      title: string;
      itemCount: number;
    }>;
    notes?: string;
  }) {
    const id = uuidv4();
    const session = {
      id,
      ...data,
      status: 'created',
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string) {
    return this.sessions.get(id);
  }

  updateStatus(id: string, status: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      this.sessions.set(id, session);
    }
    return session;
  }
}
