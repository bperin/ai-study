# Quick Start Guide: Implementing the Two-Agent System

## ✅ What's Already Done

1. ✅ **Architecture Designed** - Complete system design in `/docs/AGENTIC_ARCHITECTURE.md`
2. ✅ **Database Schema Updated** - Prisma schema with all new fields
3. ✅ **Prisma Client Generated** - Ready to use new models
4. ✅ **Test Taking Service** - Full implementation with state management
5. ✅ **Documentation** - Comprehensive guides and examples

## 🚀 Next Steps (In Order)

### Step 1: Push Database Changes

```bash
cd packages/api
npx prisma db push
```

This will apply the schema changes to your database:
- Add `PdfSession` model for HITL workflow
- Add picture card fields to `Mcq`
- Add engagement metrics to `UserAnswer`
- Add feedback fields to `TestAttempt`

### Step 2: Create Test Taking Controller

Create `packages/api/src/tests/test-taking.controller.ts`:

```typescript
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { TestTakingService } from './test-taking.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('test-attempts')
export class TestTakingController {
  constructor(
    private readonly testTakingService: TestTakingService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async startTest(@Body('userId') userId: string, @Body('pdfId') pdfId: string) {
    // Create test attempt in database
    const attempt = await this.prisma.testAttempt.create({
      data: {
        userId,
        pdfId,
        total: 0, // Will be updated
      },
    });

    // Initialize in-memory session
    const state = await this.testTakingService.initializeTestSession(
      attempt.id,
      userId,
      pdfId
    );

    return {
      attemptId: attempt.id,
      totalQuestions: state.totalQuestions,
    };
  }

  @Post(':id/answer')
  async submitAnswer(
    @Param('id') attemptId: string,
    @Body() body: { questionId: string; selectedAnswer: number; timeSpent: number }
  ) {
    return this.testTakingService.recordAnswer(
      attemptId,
      body.questionId,
      body.selectedAnswer,
      body.timeSpent
    );
  }

  @Get(':id/state')
  async getState(@Param('id') attemptId: string) {
    const state = this.testTakingService.getSessionState(attemptId);
    if (!state) {
      throw new Error('Session not found');
    }

    return {
      currentQuestionIndex: state.currentQuestionIndex,
      totalQuestions: state.totalQuestions,
      correctCount: state.correctCount,
      incorrectCount: state.incorrectCount,
      currentStreak: state.currentStreak,
    };
  }

  @Post(':id/complete')
  async completeTest(@Param('id') attemptId: string) {
    return this.testTakingService.completeTest(attemptId);
  }
}
```

### Step 3: Update Tests Module

Update `packages/api/src/tests/tests.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { TestTakingController } from './test-taking.controller';
import { TestTakingService } from './test-taking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestsController, TestTakingController],
  providers: [TestsService, TestTakingService],
  exports: [TestTakingService],
})
export class TestsModule {}
```

### Step 4: Enhance PDF Setup Agent (HITL Workflow)

Create `packages/api/src/pdfs/pdf-sessions.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PdfSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, pdfId: string, preferences: any) {
    return this.prisma.pdfSession.create({
      data: {
        userId,
        pdfId,
        userPreferences: preferences,
        status: 'planning',
      },
    });
  }

  async proposePlan(sessionId: string, plan: any) {
    return this.prisma.pdfSession.update({
      where: { id: sessionId },
      data: {
        proposedPlan: plan,
        planStatus: 'pending',
      },
    });
  }

  async approvePlan(sessionId: string) {
    return this.prisma.pdfSession.update({
      where: { id: sessionId },
      data: {
        planStatus: 'approved',
        status: 'generating',
      },
    });
  }

  async rejectPlan(sessionId: string, feedback: string) {
    const session = await this.prisma.pdfSession.findUnique({
      where: { id: sessionId },
    });

    return this.prisma.pdfSession.update({
      where: { id: sessionId },
      data: {
        planStatus: 'rejected',
        planIterations: (session?.planIterations || 0) + 1,
      },
    });
  }
}
```

### Step 5: Test the Flow

#### A. Test Database Schema

```bash
cd packages/api
npx prisma studio
```

Verify all new fields are present:
- `PdfSession` table exists
- `Mcq` has `hasPicture`, `pictureUrl`, `picturePrompt`
- `UserAnswer` has `timeSpent`, `hintsUsed`, `confidence`
- `TestAttempt` has `percentage`, `feedback`, `totalTime`

#### B. Test Test Taking Service

Create a simple test script `packages/api/test-taking-demo.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { TestTakingService } from './src/tests/test-taking.service';
import { ConfigService } from '@nestjs/config';

async function demo() {
  const prisma = new PrismaClient();
  const configService = new ConfigService();
  const service = new TestTakingService(configService, prisma);

  // Assuming you have a test user and PDF
  const userId = 'your-user-id';
  const pdfId = 'your-pdf-id';

  // Create test attempt
  const attempt = await prisma.testAttempt.create({
    data: {
      userId,
      pdfId,
      total: 0,
    },
  });

  // Initialize session
  const state = await service.initializeTestSession(attempt.id, userId, pdfId);
  console.log('Session initialized:', state);

  // Get a question
  const questions = await prisma.mcq.findMany({
    where: { objective: { pdfId } },
    take: 1,
  });

  if (questions.length > 0) {
    // Record an answer
    const result = await service.recordAnswer(
      attempt.id,
      questions[0].id,
      0, // selected answer
      15 // time spent in seconds
    );

    console.log('Answer recorded:', result);
    console.log('Encouragement:', result.encouragement);
  }

  await prisma.$disconnect();
}

demo();
```

## 📋 Checklist

- [ ] Database schema pushed (`npx prisma db push`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Test Taking Controller created
- [ ] Tests Module updated
- [ ] PDF Sessions Service created
- [ ] Test the flow with sample data
- [ ] Build frontend test interface
- [ ] Add picture card generation
- [ ] Implement HITL approval UI

## 🎯 Priority Order

1. **Immediate** (Get basic flow working):
   - Push database changes ✅ (Already done)
   - Create Test Taking Controller
   - Update Tests Module
   - Test with existing flashcards

2. **Short-term** (Enhance experience):
   - Build frontend test interface
   - Add real-time state updates
   - Implement hint system
   - Create results dashboard

3. **Medium-term** (Full features):
   - Add PDF Sessions Service
   - Implement HITL workflow
   - Add picture card generation
   - Build plan review UI

## 🔍 Testing Strategy

### Unit Tests
```typescript
describe('TestTakingService', () => {
  it('should initialize session with correct state', async () => {
    const state = await service.initializeTestSession(attemptId, userId, pdfId);
    expect(state.correctCount).toBe(0);
    expect(state.currentStreak).toBe(0);
  });

  it('should update state correctly on correct answer', async () => {
    const result = await service.recordAnswer(attemptId, questionId, correctIdx, 10);
    expect(result.isCorrect).toBe(true);
    expect(result.currentStreak).toBe(1);
  });

  it('should substitute brackets correctly', () => {
    const template = 'Score: [CURRENT_SCORE], Progress: [PROGRESS]';
    const result = service['substituteBrackets'](template, mockState);
    expect(result).toContain('Score: 5/10');
  });
});
```

### Integration Tests
```bash
# Start backend
npm run dev

# Test endpoints (no auth required for development)
curl -X POST http://localhost:3000/test-attempts \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id", "pdfId": "your-pdf-id"}'
```

## 📚 Documentation References

- **Architecture**: `/docs/AGENTIC_ARCHITECTURE.md`
- **Implementation Summary**: `/docs/IMPLEMENTATION_SUMMARY.md`
- **This Guide**: `/docs/QUICK_START.md`

## 🆘 Troubleshooting

### Issue: Prisma Client not updated
```bash
npx prisma generate
```

### Issue: Database out of sync
```bash
npx prisma db push --force-reset  # WARNING: Deletes data
```

### Issue: TypeScript errors
```bash
npm run build
```

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ Database has all new tables/fields
2. ✅ Test session initializes with state
3. ✅ Answers are recorded and state updates
4. ✅ Bracket notation works in prompts
5. ✅ Feedback is generated at test completion

---

**Ready to implement!** Start with Step 1 and work through sequentially. 🚀
