import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EvalSession } from '@prisma/client';
import { EvalSessionsRepository } from './eval-sessions.repository';
import { CreateEvalSessionDto } from './dto/create-eval-session.dto';
import { UpdateEvalSessionDto } from './dto/update-eval-session.dto';
import { FindEvalSessionsOptions } from './interfaces/eval-session.repository.interface';

@Injectable()
export class EvalSessionsService {
  private readonly logger = new Logger(EvalSessionsService.name);

  constructor(private readonly evalSessionsRepository: EvalSessionsRepository) {}

  /**
   * Create a new evaluation session
   */
  async createSession(createDto: CreateEvalSessionDto): Promise<EvalSession> {
    this.logger.debug(`Creating evaluation session for user ${createDto.userId}`);

    // Set default values for optional fields
    const sessionData = {
      ...createDto,
      includeImages: createDto.includeImages ?? false,
      imageCount: createDto.includeImages ? (createDto.imageCount ?? 0) : 0,
      status: 'planning',
      planStatus: 'pending',
      iterationCount: 0,
    };

    return this.evalSessionsRepository.create(sessionData);
  }

  /**
   * Get a session by ID
   */
  async getSessionById(id: string): Promise<EvalSession> {
    const session = await this.evalSessionsRepository.findById(id);
    if (!session) {
      throw new NotFoundException(`Evaluation session with ID ${id} not found`);
    }
    return session;
  }

  /**
   * Get sessions for a user
   */
  async getUserSessions(userId: string, options?: FindEvalSessionsOptions): Promise<EvalSession[]> {
    return this.evalSessionsRepository.findByUserId(userId, options);
  }

  /**
   * Update a session
   */
  async updateSession(id: string, updateDto: UpdateEvalSessionDto): Promise<EvalSession> {
    // Ensure session exists
    await this.getSessionById(id);

    // If includeImages is set to false, reset imageCount to 0
    if (updateDto.includeImages === false) {
      updateDto.imageCount = 0;
    }

    return this.evalSessionsRepository.update(id, updateDto);
  }

  /**
   * Update session plan
   */
  async updateSessionPlan(id: string, proposedPlan: any): Promise<EvalSession> {
    // Ensure session exists
    await this.getSessionById(id);

    return this.evalSessionsRepository.update(id, {
      proposedPlan,
      planStatus: 'ready',
      iterationCount: (await this.getSessionById(id)).iterationCount + 1,
    });
  }

  /**
   * Mark session as generating
   */
  async markSessionAsGenerating(id: string): Promise<EvalSession> {
    // Ensure session exists
    await this.getSessionById(id);

    return this.evalSessionsRepository.update(id, {
      planStatus: 'generating',
    });
  }

  /**
   * Mark session as completed
   */
  async markSessionAsCompleted(id: string): Promise<EvalSession> {
    // Ensure session exists
    await this.getSessionById(id);

    return this.evalSessionsRepository.update(id, {
      status: 'completed',
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<EvalSession> {
    // Ensure session exists
    await this.getSessionById(id);

    return this.evalSessionsRepository.delete(id);
  }

  /**
   * Count sessions
   */
  async countSessions(userId?: string): Promise<number> {
    return this.evalSessionsRepository.count(userId);
  }
}
