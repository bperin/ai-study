import { EvalSession } from '@prisma/client';

export interface CreateEvalSessionDto {
  userId: string;
  userPreferences: any;
  proposedPlan?: any;
  planStatus?: string;
  iterationCount?: number;
  difficulty?: string;
  totalItems?: number;
  includeImages?: boolean;
  imageCount?: number;
  timeLimitMins?: number;
  status?: string;
}

export interface UpdateEvalSessionDto {
  userPreferences?: any;
  proposedPlan?: any;
  planStatus?: string;
  iterationCount?: number;
  difficulty?: string;
  totalItems?: number;
  includeImages?: boolean;
  imageCount?: number;
  timeLimitMins?: number;
  status?: string;
}

export interface FindEvalSessionsOptions {
  userId?: string;
  status?: string;
  skip?: number;
  take?: number;
}

export interface IEvalSessionRepository {
  create(data: CreateEvalSessionDto): Promise<EvalSession>;
  findById(id: string): Promise<EvalSession | null>;
  findByUserId(userId: string, options?: FindEvalSessionsOptions): Promise<EvalSession[]>;
  update(id: string, data: UpdateEvalSessionDto): Promise<EvalSession>;
  delete(id: string): Promise<EvalSession>;
  count(userId?: string): Promise<number>;
}
