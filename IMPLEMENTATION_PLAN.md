# AI Study Backend Implementation Plan

## 📋 Executive Summary

This document outlines a comprehensive plan to fix critical issues in the AI Study backend, focusing on:
- **ADK Integration** - Multi-agent system currently falling back to regular Gemini calls
- **RAG Pipeline** - PDF ingestion and vectorization not properly linked
- **Module Architecture** - Circular dependencies and service duplication
- **Data Integrity** - Missing relationships and validation
- ✅ **Background Processing** - COMPLETED with BullMQ job queues

---

## 🔴 Critical Issues Identified

### 1. ADK Integration Failures
**Problem**: Multi-agent architecture doesn't work - ADK falls back to regular Gemini calls

**Root Causes**:
- `packages/api/src/ai/adk-runner.service.ts:14-51` - Initialization succeeds but runtime execution fails
- `packages/api/src/pdfs/pdfs.service.ts:390-417` - Error handling immediately falls back without debugging
- `packages/api/src/ai/parallel-generation.service.ts:158-178` - Runner creation fails silently
- `CustomSessionService` session lookup has fragile signature handling

**Impact**: Losing RAG-enhanced generation, no tool calling, multi-agent orchestration not functioning

---

### 2. Broken PDF ↔ RAG Document Link
**Problem**: No database relationship between PDF records and RAG Document records

**Issues**:
- `packages/api/prisma/schema.prisma:26-37` - `Pdf` model has no `documentId` field
- `packages/api/src/uploads/uploads.service.ts:76` - RAG ingestion triggered but errors caught silently
- `packages/api/src/ai/parallel-generation.service.ts:346-363` - Complex lookup using filename/GCS path matching

**Impact**: RAG context retrieval unreliable, no way to check if PDF has been vectorized

---

### 3. Module Dependency Issues
**Problem**: Circular dependencies and service duplication

**Issues**:
- `packages/api/src/ai/ai.module.ts:4` imports `PdfsModule`
- `packages/api/src/pdfs/pdfs.module.ts:4-5` imports AI services directly
- `GeminiService` duplicated in RAG and PDFs modules
- `PdfTextService` logic duplicated in 3 places

---

### 4. Security Vulnerability
**Problem**: SQL injection risk in vector search

**Location**: `packages/api/src/rag/services/retrieve.service.ts:33-45`

Uses `$queryRawUnsafe` with string interpolation

---

### 5. Background Processing Issues
**Problem**: Using `setImmediate` instead of proper job queue

**Issues**:
- `packages/api/src/pdfs/pdfs.service.ts:69-105` - Background work with `setImmediate`
- No retry mechanism for failed operations
- No progress tracking for long-running tasks

---

### 6. DTO & Validation Gaps
**Issues**:
- `packages/api/src/pdfs/dto/chat-message.dto.ts:17-18` - No validation on `conversationHistory` items
- Missing DTOs for ingestion response, progress updates, errors
- Inconsistent response formats across endpoints

---

### 7. Database Schema Issues
**Problems**:
- Status stored as string without enum validation
- `Document.ownerId` not linked to `User`
- Dual storage of embeddings creates inconsistency risk
- Missing indexes on frequently queried fields

---

## 🎯 Implementation Phases

### Phase 1: Critical Fixes (Week 1) 🔴 HIGH PRIORITY

#### 1.1 Fix ADK Integration
- Add comprehensive logging to ADK runner initialization
- Fix CustomSessionService signature handling
- Remove premature fallbacks to Gemini
- Add `/health/adk` endpoint to test ADK availability

**Files to Modify**:
- `packages/api/src/ai/adk-runner.service.ts`
- `packages/api/src/ai/adk.helpers.ts`
- `packages/api/src/pdfs/pdfs.service.ts`
- `packages/api/src/ai/parallel-generation.service.ts`
- `packages/api/src/app.controller.ts`

---

#### 1.2 Establish PDF ↔ Document Link
- Add `documentId` field to `Pdf` model in Prisma schema
- Create migration
- Update uploads service to link documents after ingestion
- Add `/pdfs/:id/rag-status` endpoint
- Simplify document lookup logic

**Schema Changes**:
```prisma
model Pdf {
  documentId  String?   @unique
  document    Document? @relation(fields: [documentId], references: [id])
}

model Document {
  pdf Pdf?
}

enum DocumentStatus {
  PROCESSING
  COMPLETED
  FAILED
  READY
}
```

**Files to Modify**:
- `packages/api/prisma/schema.prisma`
- `packages/api/src/uploads/uploads.service.ts`
- `packages/api/src/pdfs/pdfs.controller.ts`
- `packages/api/src/pdfs/pdfs.service.ts`
- `packages/api/src/ai/parallel-generation.service.ts`

---

#### 1.3 Fix SQL Injection Vulnerability
- Replace `$queryRawUnsafe` with `$queryRaw` using Prisma.sql template
- Add proper error handling and logging
- Implement fallback strategy with user notification

**Files to Modify**:
- `packages/api/src/rag/services/retrieve.service.ts`

---

#### 1.4 Add Global Error Handler
- Create `ErrorResponseDto`
- Create `AllExceptionsFilter`
- Register filter globally in main.ts

**Files to Create**:
- `packages/api/src/common/dto/error-response.dto.ts`
- `packages/api/src/common/filters/http-exception.filter.ts`

**Files to Modify**:
- `packages/api/src/main.ts`

---

### Phase 2: Module Refactoring (Week 2) 🟡 MEDIUM PRIORITY

#### 2.1 Create Shared Module
- Create `SharedModule` with common services
- Move `GeminiService` to shared
- Move `PdfTextService` to shared
- Update all imports
- Remove duplicate services from modules

**Module Structure**:
```
SharedModule (Global)
├── GeminiService
└── PdfTextService
```

**Files to Create**:
- `packages/api/src/shared/shared.module.ts`
- `packages/api/src/shared/services/gemini.service.ts` (moved)
- `packages/api/src/shared/services/pdf-text.service.ts` (moved)

**Files to Modify**:
- `packages/api/src/app.module.ts`
- `packages/api/src/pdfs/pdfs.module.ts`
- `packages/api/src/rag/rag.module.ts`
- `packages/api/src/ai/ai.module.ts`
- All files importing GeminiService or PdfTextService

---

#### 2.2 Break Circular Dependencies
- Remove `PdfsModule` import from `AiModule`
- Export `GcsService` from `PdfsModule`
- Update services to inject specific dependencies

**Dependency Graph**:
```
AppModule
├── SharedModule (Global)
├── PrismaModule (Global)
├── AiModule (Global)
├── RagModule
├── PdfsModule
├── TestsModule
└── UploadsModule
```

---

#### 2.3 Split RAG Module
- Create `IngestionModule` (chunking, embedding, storage)
- Create `RetrievalModule` (search, ranking)
- Update `RagModule` to be a facade

**Files to Create**:
- `packages/api/src/rag/ingestion/ingestion.module.ts`
- `packages/api/src/rag/retrieval/retrieval.module.ts`

---

### Phase 3: Data Layer Improvements (Week 3) 🟡 MEDIUM PRIORITY

#### 3.1 Add Database Enums
- Add `DocumentStatus`, `PdfSessionStatus`, `TestAttemptStatus` enums
- Update models to use enums
- Create migration
- Update TypeScript code to use enums

---

#### 3.2 Add Missing Indexes
```prisma
model Document {
  @@index([sourceUri])
  @@index([status])
  @@index([ownerId, status])
}

model Pdf {
  @@index([userId])
  @@index([gcsPath])
  @@index([documentId])
}

model TestAttempt {
  @@index([userId, completedAt])
  @@index([pdfId, completedAt])
}
```

---

#### 3.3 Implement Repository Pattern
- Create `BaseRepository`
- Create `PdfRepository`
- Create `DocumentRepository`
- Update services to use repositories

**Files to Create**:
- `packages/api/src/common/repositories/base.repository.ts`
- `packages/api/src/pdfs/repositories/pdf.repository.ts`
- `packages/api/src/rag/repositories/document.repository.ts`

---

### Phase 4: DTO & Validation (Week 4) 🟢 LOW-MEDIUM PRIORITY

#### 4.1 Create Missing DTOs
- `IngestResponseDto`
- `FlashcardProgressDto`
- `RagStatusDto`

---

#### 4.2 Add Comprehensive Validation
- Update existing DTOs with `@MaxLength`, `@ValidateNested`
- Create custom validators (GCS URI)
- Enable global validation pipe

---

### Phase 5: Background Processing (Week 5) ✅ COMPLETED

#### 5.1 Install and Configure BullMQ ✅
```bash
npm install bullmq ioredis @nestjs/bullmq
```

- ✅ Created `QueueModule` with global scope
- ✅ Configured Redis connection (Upstash serverless)
- ✅ Registered queues: pdf-ingestion, flashcard-generation, test-analysis
- ✅ Set up GCP Secret Manager for Redis credentials
- ✅ Configured Cloud Run deployment with Redis secrets

---

#### 5.2 Create Job Processors ✅
- ✅ `PdfIngestionProcessor` - Handles PDF download, text extraction, chunking, embeddings
- ✅ `FlashcardGenerationProcessor` - Generates flashcards with WebSocket updates
- ✅ `TestAnalysisProcessor` - Basic structure for future expansion

---

#### 5.3 Replace setImmediate with Queue Jobs ✅
- ✅ Updated `uploads.service.ts` to queue ingestion jobs
- ✅ Updated `pdfs.service.ts` to queue generation jobs (removed 145 lines of nested logic)
- ✅ Added retry logic with exponential backoff (3 attempts, 2s delay)
- ✅ Automatic job cleanup (completed: 1hr, failed: 24hrs)

---

#### 5.4 Add Job Progress Tracking ✅
- ✅ Created `GET /queue/:queueName/jobs/:jobId` endpoint
- ✅ Job progress tracking in processors (10% → 100%)
- ✅ WebSocket progress updates maintained
- ⏭️ Job cancellation (deferred - not critical)

**Implementation Details:** See `PHASE_5_IMPLEMENTATION.md`

---

### Phase 6: Observability & Testing (Week 6) 🟢 LOW PRIORITY

#### 6.1 Add Structured Logging
- Install Winston
- Configure structured logging
- Replace console.log calls
- Add correlation IDs

---

#### 6.2 Add Health Checks
- Database connection check
- GCS connectivity check
- ADK availability check
- Vector extension check
- Redis connection check

---

#### 6.3 Unit & Integration Tests
- Test RAG pipeline end-to-end
- Test ADK agent execution
- Test PDF ingestion flow
- Test flashcard generation
- Test background job processing

---

## 🎯 Quick Wins (Immediate Actions)

1. **Add PDF-Document linking** - Prevents RAG lookup failures
2. **Fix SQL injection in vector search** - Security issue
3. **Add ADK debug logging** - Understand why it's failing
4. **Create ingestion status endpoint** - User visibility
5. **Add global error handler** - Consistent error responses

---

## 📊 Module Cleanup Summary

### Modules to Merge
- `PdfTextService` instances → Single `PdfProcessingService`
- `GeminiService` instances → Single `AiService` in shared module

### Modules to Split
- `RagModule` → `IngestionModule` + `RetrievalModule`

### Modules to Create
- `SharedModule` - Common utilities
- `QueueModule` - Background jobs

### Dependencies to Fix
```
Current: AiModule → PdfsModule (circular)
Fixed:   Both → SharedModule

Current: Multiple GeminiService instances
Fixed:   Single instance in SharedModule
```

---

## 🧪 Testing Strategy

### Phase 1 Testing
- [ ] Call `/health/adk` endpoint and verify ADK status
- [ ] Upload PDF and check `/pdfs/:id/rag-status`
- [ ] Verify `documentId` is set after ingestion
- [ ] Test RAG queries with various inputs
- [ ] Trigger various error conditions and check responses

### Phase 2 Testing
- [ ] Run `npm run build` to check for import errors
- [ ] Start server and verify all endpoints work
- [ ] Check no duplicate service instances
- [ ] Verify no circular dependency warnings

### Phase 3 Testing
- [ ] Run migrations successfully
- [ ] Verify status values are validated
- [ ] Test invalid status values are rejected
- [ ] Check query performance with EXPLAIN ANALYZE

### Phase 4 Testing
- [ ] Test with invalid inputs
- [ ] Verify validation errors are clear
- [ ] Check performance impact of validation

### Phase 5 Testing
- [ ] Start Redis and verify connection
- [ ] Upload PDF and verify job is queued
- [ ] Check job completes successfully
- [ ] Test job retry on failure
- [ ] Verify WebSocket progress updates

### Phase 6 Testing
- [ ] Check structured logs are readable
- [ ] Verify health check endpoints work
- [ ] Run unit tests with coverage
- [ ] Run integration tests end-to-end

---

## 📝 Migration Checklist

### Database Migrations
- [ ] Add `documentId` to Pdf model
- [ ] Add status enums
- [ ] Add performance indexes
- [ ] Migrate existing data to link PDFs with Documents

### Code Migrations
- [ ] Move services to SharedModule
- [ ] Update all imports
- [ ] Replace setImmediate with queue jobs
- [ ] Replace console.log with Winston

### Configuration
- [ ] Add Redis configuration to .env
- [ ] Update Cloud Run deployment for Redis
- [ ] Configure BullMQ queues
- [ ] Set up job monitoring

---

## 🚀 Deployment Strategy

### Phase 1 Deployment
1. Deploy database migrations
2. Deploy code changes
3. Monitor ADK health endpoint
4. Verify RAG status endpoint works
5. Check error logs for issues

### Phase 2 Deployment
1. Deploy module refactoring
2. Monitor for dependency injection errors
3. Verify all endpoints still work
4. Check performance metrics

### Phase 5 Deployment
1. Deploy Redis to Cloud Run
2. Deploy queue module
3. Monitor job execution
4. Verify retry logic works
5. Check job completion rates

---

## 📈 Success Metrics

### Phase 1
- ADK health check returns "healthy"
- 100% of PDFs have linked Documents
- Zero SQL injection vulnerabilities
- Consistent error responses across all endpoints

### Phase 2
- Zero circular dependency warnings
- Single instance of shared services
- Clean module dependency graph

### Phase 3
- All status fields use enums
- Query performance improved by 30%+
- Zero direct Prisma calls in services

### Phase 5
- 100% of background jobs use queue
- Job retry success rate > 95%
- Job completion time tracked
- Zero lost jobs on server restart

---

## 🔧 Development Setup

### Prerequisites
```bash
# Install dependencies
npm install

# Start PostgreSQL with pgvector
docker-compose up -d postgres

# Start Redis
docker-compose up -d redis

# Run migrations
cd packages/api
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Google Cloud
GOOGLE_API_KEY="..."
GOOGLE_CLOUD_PROJECT_ID="..."
GCP_BUCKET_NAME="..."
GCP_SA_KEY="..."

# Redis (Phase 5)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
```

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Google ADK Documentation](https://github.com/google/adk)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

## 🤝 Contributing

When implementing changes:
1. Create a feature branch from `main`
2. Follow the phase order in this plan
3. Write tests for new functionality
4. Update this document if plans change
5. Submit PR with detailed description

---

**Last Updated**: December 18, 2025
**Version**: 1.0
**Status**: Ready for Implementation
