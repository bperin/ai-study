# AI Study

**A study tool that converts PDFs into interactive flashcards using RAG and Google Gemini.**

## Overview

AI Study leverages Google Gemini and Retrieval-Augmented Generation (RAG) to transform PDF documents into personalized study materials. By ingesting content and retrieving relevant context, it generates high-quality multiple-choice questions for effective self-testing.

**Key Capabilities:**
- **RAG-Powered Generation**: Chunks and embeds PDFs to ground AI generation in your specific source material.
- **Smart Flashcards**: Automatically identifies key concepts and creates questions with explanations.
- **Study Mode**: Interactive testing with instant feedback and progress tracking.

**Note**: Currently supports text-based PDFs. Image-based PDFs require OCR integration (future enhancement).

## 🏗 System Architecture & RAG Data Flow

The system uses a multi-agent architecture powered by **Google Vertex AI**.

<details open>
<summary><b>Architecture Diagrams</b></summary>

| Diagram Type | Visualization |
|---|---|
| **System Architecture** | [![System Architecture](https://github.com/bperin/ai-study/blob/main/docs/ai-study-architecture-1.png)](./docs/ai-study-architecture.md) |
| **Agent Details** | [![Agent Details](https://github.com/bperin/ai-study/blob/main/docs/ai-study-agent-details-1.png)](./docs/ai-study-agent-details.md) |
| **Data Flow** | [![Data Flow](https://github.com/bperin/ai-study/blob/main/docs/ai-study-data-flow-1.png)](./docs/ai-study-data-flow.md) |
| **Workflow Sequence** | [![Workflow Sequence](https://github.com/bperin/ai-study/blob/main/docs/ai-study-workflow-1.png)](./docs/ai-study-workflow.md) |

</details>

### RAG Implementation Details

The core of AI Study is its RAG pipeline, ensuring accuracy and relevance:

1.  **Ingestion**: Uploaded PDFs are processed by the `PDFs Module`, split into semantic chunks.
2.  **Embedding**: Chunks are embedded using **Vertex AI `text-embedding-004`** and stored in PostgreSQL with `pgvector` (via Prisma).
3.  **Retrieval**: When generating questions or answering chat queries, the system performs a cosine similarity search to find the most relevant chunks.
4.  **Generation**: Retrieved chunks are injected into the prompt context for **Gemini 2.5 Flash**, enabling the model to answer based on the document's specific content.

### Multi-Agent Workflow

-   **Content Analyzer**: Scans the PDF (or retrieved chunks) to identify learning objectives.
-   **Question Generator**: Creates questions targeting those objectives, referencing specific content.
-   **Quality Analyzer**: Validates the educational value and accuracy of generated cards.

### Background Job Processing

AI Study uses **BullMQ** with Redis for reliable background processing:

-   **PDF Ingestion**: Asynchronous processing of uploaded PDFs (text extraction, chunking, embedding)
-   **Flashcard Generation**: Background generation of questions with progress tracking
-   **Job Monitoring**: Track job status via `/queue/:queueName/jobs/:jobId` endpoint
-   **Automatic Retries**: Failed jobs retry with exponential backoff (3 attempts)
-   **WebSocket Updates**: Real-time progress notifications to frontend

**Production**: Uses Upstash Redis (serverless) for zero-maintenance job queues.  
**Local Dev**: Connects to local Redis instance for testing.

## Tech Stack

-   **Backend**: NestJS, Prisma, PostgreSQL (with pgvector), Google Vertex AI, BullMQ + Redis.
-   **Frontend**: Next.js, TypeScript, Radix UI.
-   **Infrastructure**: Google Cloud Run, Cloud Storage, Cloud Build, Upstash Redis.

## 🚀 Quick Start

### Prerequisites
-   Node.js 18+ & npm
-   PostgreSQL (local or cloud)
-   Redis (local or Upstash for production)
-   Google Cloud Project (Vertex AI, Storage, Cloud Build enabled)

### Installation

1.  **Clone & Install**:
    ```bash
    git clone <repository-url>
    cd ai-study
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env` and `packages/api/.env`, then populate with your Google Cloud credentials and DB URL.

3.  **Database Init**:
    ```bash
    cd packages/api
    npx prisma migrate dev
    ```

4.  **Redis Setup** (Local Development):
    ```bash
    # Install Redis
    brew install redis
    
    # Start Redis
    brew services start redis
    ```
    
    For production, configure Upstash Redis credentials in GCP Secret Manager (see deployment section).

5.  **Run**:
    ```bash
    ./run.sh
    ```
    Starts Backend (:3000) and Frontend (:3001) with auto-generated SDKs.

## 📚 Documentation & Support

-   **API Swagger**: `http://localhost:3000/api`
-   **Database Studio**: `npm run start:studio`
-   **Job Queue Monitoring**: Check job status at `GET /queue/:queueName/jobs/:jobId`
-   **Implementation Details**: See `PHASE_5_IMPLEMENTATION.md` for background processing architecture

## 🚢 Deployment

Automated CI/CD via **GitHub Actions** with Google Cloud integration:

- **Workload Identity Federation** for secure authentication
- **Google Cloud Secrets** for environment variables and credentials
- **Docker** multi-platform builds pushed to Artifact Registry
- **Cloud Run** for serverless API and frontend hosting
- **Automatic database migrations** with Prisma on deploy

Push to `main` branch to trigger deployment.

## 📝 License

MIT License - see [LICENSE](LICENSE) file.
