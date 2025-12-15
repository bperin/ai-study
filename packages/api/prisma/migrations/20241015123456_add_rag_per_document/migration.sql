-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS "vector";

-- Align existing tables with current Prisma schema
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pdf" ADD COLUMN IF NOT EXISTS "gcsPath" TEXT;
ALTER TABLE "Mcq" ADD COLUMN IF NOT EXISTS "hasPicture" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Mcq" ADD COLUMN IF NOT EXISTS "pictureUrl" TEXT;
ALTER TABLE "Mcq" ADD COLUMN IF NOT EXISTS "picturePrompt" TEXT;
ALTER TABLE "TestAttempt" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "TestAttempt" ADD COLUMN IF NOT EXISTS "percentage" DOUBLE PRECISION;
ALTER TABLE "TestAttempt" ADD COLUMN IF NOT EXISTS "totalTime" INTEGER;
ALTER TABLE "TestAttempt" ADD COLUMN IF NOT EXISTS "feedback" JSONB;
ALTER TABLE "TestAttempt" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "TestAttempt" ALTER COLUMN "score" SET DEFAULT 0;

-- PDF Session table for HITL workflows
CREATE TABLE IF NOT EXISTS "PdfSession" (
    "id" TEXT NOT NULL,
    "pdfId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userPreferences" JSONB NOT NULL,
    "proposedPlan" JSONB,
    "planStatus" TEXT NOT NULL DEFAULT 'pending',
    "planIterations" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT,
    "totalQuestions" INTEGER,
    "includePictures" BOOLEAN NOT NULL DEFAULT false,
    "pictureCount" INTEGER NOT NULL DEFAULT 0,
    "timeLimit" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PdfSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PdfSession_pdfId_idx" ON "PdfSession"("pdfId");
CREATE INDEX IF NOT EXISTS "PdfSession_userId_idx" ON "PdfSession"("userId");

ALTER TABLE "PdfSession" ADD CONSTRAINT "PdfSession_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "Pdf"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfSession" ADD CONSTRAINT "PdfSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RAG per document schema
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUri" TEXT,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Chunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "startChar" INTEGER,
    "endChar" INTEGER,
    "embeddingJson" JSONB,
    "embeddingVec" vector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Chunk_documentId_chunkIndex_key" ON "Chunk"("documentId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "Chunk_documentId_idx" ON "Chunk"("documentId");

ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "QueryLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "model" TEXT,
    "topK" INTEGER,
    "usedChunks" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QueryLog_documentId_createdAt_idx" ON "QueryLog"("documentId", "createdAt");
ALTER TABLE "QueryLog" ADD CONSTRAINT "QueryLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
