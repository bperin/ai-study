import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserRepository } from './user.repository';
import { DocumentRepository } from './document.repository';
import { PdfRepository } from './pdf.repository';
import { ObjectiveRepository } from './objective.repository';
import { TestAttemptRepository } from './test-attempt.repository';
import { McqRepository } from './mcq.repository';
import { UserAnswerRepository } from './user-answer.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    DocumentRepository,
    PdfRepository,
    ObjectiveRepository,
    TestAttemptRepository,
    McqRepository,
    UserAnswerRepository,
  ],
  exports: [
    UserRepository,
    DocumentRepository,
    PdfRepository,
    ObjectiveRepository,
    TestAttemptRepository,
    McqRepository,
    UserAnswerRepository,
  ],
})
export class RepositoryModule {}
