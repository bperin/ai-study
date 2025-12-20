# Phase 5: Background Processing Implementation

## Overview
Successfully implemented BullMQ-based job queue system to replace `setImmediate` and async IIFE patterns with proper background job processing.

## What Was Implemented

### 1. Dependencies Installed
- `bullmq` - Modern Redis-based job queue for Node.js
- `ioredis` - Redis client for Node.js
- `@nestjs/bullmq` - NestJS integration for BullMQ

### 2. Queue Infrastructure

#### QueueModule (`/packages/api/src/queue/queue.module.ts`)
- Global module providing queue services across the application
- Configured Redis connection with environment variables
- Registered three queues:
  - `pdf-ingestion` - For processing PDF uploads and RAG ingestion
  - `flashcard-generation` - For generating flashcards from PDFs
  - `test-analysis` - For analyzing test results (placeholder for future)

#### QueueService (`/packages/api/src/queue/queue.service.ts`)
- Centralized service for adding jobs to queues
- Methods:
  - `addPdfIngestionJob()` - Queue PDF ingestion with retry logic
  - `addFlashcardGenerationJob()` - Queue flashcard generation
  - `addTestAnalysisJob()` - Queue test analysis
  - `getJob()` - Retrieve job by ID
  - `getJobState()` - Get current job status and progress
- Configured with exponential backoff retry strategy (3 attempts, 2s initial delay)
- Automatic job cleanup (completed: 1hr, failed: 24hrs)

### 3. Job Processors

#### PdfIngestionProcessor (`/packages/api/src/queue/processors/pdf-ingestion.processor.ts`)
- Handles PDF download from GCS
- Extracts text using PdfService
- Chunks text and generates embeddings
- Saves chunks to database with vector embeddings
- Updates job progress (10% → 30% → 50% → 60% → 70% → 95% → 100%)
- Links PDF to Document record on completion
- Updates document status to COMPLETED or FAILED

#### FlashcardGenerationProcessor (`/packages/api/src/queue/processors/flashcard-generation.processor.ts`)
- Generates flashcards using ParallelGenerationService
- Updates PdfSession status
- Sends WebSocket status updates to users
- Handles partial success (marks completed if any questions generated)
- Updates job progress (10% → 90% → 100%)

#### TestAnalysisProcessor (`/packages/api/src/queue/processors/test-analysis.processor.ts`)
- Placeholder for future test analysis features
- Basic structure in place for expansion

### 4. Service Updates

#### UploadsService (`/packages/api/src/uploads/uploads.service.ts`)
**Before:** Used promise chain with async IIFE
```typescript
this.ingestService.createFromGcs(fileName, gcsUri)
  .then(async (result) => { /* ... */ })
  .catch(error => { /* ... */ });
```

**After:** Uses queue with immediate document linking
```typescript
const document = await this.prisma.document.create({ /* ... */ });
await this.queueService.addPdfIngestionJob({
  documentId: document.id,
  gcsUri,
  title: fileName,
  pdfId: pdf.id,
});
await this.prisma.pdf.update({
  where: { id: pdf.id },
  data: { documentId: document.id },
});
```

#### PdfsService (`/packages/api/src/pdfs/pdfs.service.ts`)
**Before:** Used `setImmediate` with async IIFE (145 lines of nested logic)
```typescript
setImmediate(async () => {
  try {
    await this.parallelGenerationService.generateFlashcardsParallel(/* ... */);
    // ... complex error handling
  } catch (e) { /* ... */ }
});
```

**After:** Simple queue job (8 lines)
```typescript
await this.queueService.addFlashcardGenerationJob({
  pdfId,
  sessionId: session.id,
  userId,
  userPrompt,
  filename: pdf.filename,
  gcsPathOrContent,
});
```

### 5. Job Progress Tracking

#### QueueController (`/packages/api/src/queue/queue.controller.ts`)
- New endpoint: `GET /queue/:queueName/jobs/:jobId`
- Returns job state, progress, errors, and return values
- Enables frontend to poll for job status

## Configuration Required

### Environment Variables
Add to `.env`:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, leave empty for local dev
```

### Local Development
Start Redis:
```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

### Production (Cloud Run)
Add Redis instance (Cloud Memorystore or external Redis):
1. Create Redis instance
2. Configure VPC connector for Cloud Run
3. Set environment variables in Cloud Run

## Benefits

### 1. Reliability
- **Automatic retries** with exponential backoff
- **Job persistence** - Jobs survive server restarts
- **Error tracking** - Failed jobs kept for 24 hours for debugging
- **No request timeouts** - Long-running tasks don't block HTTP requests

### 2. Observability
- **Progress tracking** - Real-time job progress updates
- **Job history** - Completed jobs kept for 1 hour
- **State inspection** - Query job status at any time
- **Structured logging** - All processors log progress

### 3. Scalability
- **Horizontal scaling** - Multiple workers can process jobs
- **Queue prioritization** - Can add priority levels later
- **Rate limiting** - Can add concurrency limits per queue
- **Resource isolation** - CPU-intensive tasks don't block API

### 4. Developer Experience
- **Cleaner code** - Removed 100+ lines of nested async logic
- **Type safety** - Strongly typed job data interfaces
- **Testability** - Processors can be unit tested
- **Maintainability** - Centralized queue configuration

## Testing Checklist

### Phase 5 Testing (from IMPLEMENTATION_PLAN.md)
- [ ] Start Redis and verify connection
- [ ] Upload PDF and verify job is queued
- [ ] Check job completes successfully via `/queue/pdf-ingestion/jobs/:jobId`
- [ ] Test job retry on failure (simulate Redis disconnect)
- [ ] Verify WebSocket progress updates for flashcard generation
- [ ] Check that document status updates correctly
- [ ] Verify PDF-Document linking works
- [ ] Test concurrent job processing

### Manual Testing Steps

1. **Start Redis**
   ```bash
   redis-server
   ```

2. **Start API**
   ```bash
   cd packages/api
   npm run start:dev
   ```

3. **Upload a PDF**
   - Use the web UI or API endpoint
   - Note the returned `documentId`

4. **Check Job Status**
   ```bash
   # Get job ID from logs, then:
   curl http://localhost:3000/queue/pdf-ingestion/jobs/{jobId}
   ```

5. **Verify Database**
   ```sql
   -- Check document status
   SELECT id, title, status, "errorMessage" FROM "Document" ORDER BY "createdAt" DESC LIMIT 5;
   
   -- Check chunks were created
   SELECT COUNT(*) FROM "Chunk" WHERE "documentId" = 'your-document-id';
   ```

6. **Generate Flashcards**
   - Use the web UI to generate flashcards
   - Watch WebSocket updates
   - Check job status endpoint

## Migration Notes

### Removed Code Patterns
- ❌ `setImmediate(async () => { ... })`
- ❌ Promise chains with `.then().catch()`
- ❌ Async IIFE: `(async () => { ... })()`

### New Patterns
- ✅ `await queueService.addJob({ ... })`
- ✅ Job processors with `@Processor()` decorator
- ✅ Progress tracking with `job.updateProgress()`
- ✅ Structured error handling in processors

### IngestService Changes
The `IngestService` still has async IIFE patterns in:
- `createFromText()` - Line 37-47
- `createFromUpload()` - Line 68-79
- `createFromGcs()` - Line 100-115
- `reprocessDocument()` - Line 146-163
- `reprocessAllDocuments()` - Line 177-188

**Recommendation:** These should be refactored to use the queue in a future iteration, but are lower priority since:
1. `createFromGcs()` is now bypassed by `UploadsService` using the queue directly
2. The other methods are less frequently used
3. They work correctly for now

## Next Steps

1. **Add WebSocket Progress Updates**
   - Emit progress events from processors
   - Update frontend to display progress bars

2. **Add Job Cancellation**
   - Implement `DELETE /queue/:queueName/jobs/:jobId`
   - Handle graceful shutdown in processors

3. **Add Queue Monitoring**
   - Dashboard for queue health
   - Metrics: job count, processing time, failure rate
   - Alerts for stuck jobs

4. **Optimize Batch Processing**
   - Tune batch sizes based on performance
   - Add parallel embedding generation
   - Consider bulk insert optimizations

5. **Production Deployment**
   - Set up Cloud Memorystore for Redis
   - Configure VPC connector
   - Add health checks for Redis connection
   - Monitor queue metrics

## Files Modified

### New Files
- `/packages/api/src/queue/queue.module.ts`
- `/packages/api/src/queue/queue.service.ts`
- `/packages/api/src/queue/queue.controller.ts`
- `/packages/api/src/queue/processors/pdf-ingestion.processor.ts`
- `/packages/api/src/queue/processors/flashcard-generation.processor.ts`
- `/packages/api/src/queue/processors/test-analysis.processor.ts`

### Modified Files
- `/packages/api/src/app.module.ts` - Added QueueModule import
- `/packages/api/src/uploads/uploads.service.ts` - Replaced IngestService with QueueService
- `/packages/api/src/pdfs/pdfs.service.ts` - Replaced setImmediate with queue
- `/packages/api/.env.example` - Added Redis configuration
- `/packages/api/package.json` - Added bullmq, ioredis, @nestjs/bullmq

## Known Issues

None at this time. Build passes successfully.

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS BullMQ Integration](https://docs.nestjs.com/techniques/queues)
- [Redis Documentation](https://redis.io/docs/)
