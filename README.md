# AI Study

**A study tool that converts PDFs into interactive flashcards.**

## Overview

This project uses Google Gemini to help students review material. It breaks down PDFs into key concepts and generates multiple-choice questions for self-testing.

The backend uses multiple AI agents to process the content:

1.  **Analyzer**: Reads the PDF to find main topics.
2.  **Generator**: Creates questions based on those topics.
3.  **Reviewer**: Checks the questions for quality.

## Features

- **PDF Upload**: Secure upload to Google Cloud Storage.
- **Flashcard Generation**: Automated creation of study materials.
- **Study Mode**: Interactive testing with instant feedback.
- **Progress Saving**: Resumable sessions so you don't lose your place.
- **Analysis**: Simple feedback on what to study next based on your results.

## Tech Stack

- **Backend**: NestJS, Prisma, PostgreSQL, Google Vertex AI (Gemini).
- **Frontend**: Next.js, TypeScript, Radix UI.
- **Infrastructure**: Google Cloud Run, Cloud Build, Cloud Storage.

## 🏗 Architecture

### Backend (`packages/api`)

Built with **NestJS**, following a modular architecture.

- **AI Module (`src/ai`)**: Contains the Gemini service and agent definitions.
    - `gemini.service.ts`: Core service managing LLM interactions.
    - `agents.ts`: Definitions for Content, Question, and Quality agents.
    - `tools.ts`: Custom tools for agents (PDF reading, DB saving, Web search).
- **PDFs Module (`src/pdfs`)**: Handles PDF upload, storage, and text extraction.
- **Tests Module (`src/tests`)**: Manages test attempts, scoring, and session state.
- **Database**: **Prisma** ORM with PostgreSQL.

### Frontend (`packages/web`)

Built with **Next.js** (App Router), focusing on a modern, responsive UI.

- **UI Components**: **Radix UI** primitives styled with **Shadcn UI** and **Tailwind CSS**.
- **State Management**: React hooks for real-time study session management.
- **API Integration**: Auto-generated TypeScript SDK (`npm run codegen`) ensures frontend types always match the backend.

### 🤖 Multi-Agent Workflow

1.  **Ingestion**: User uploads a PDF to GCS.
2.  **Analysis**: The **Content Analyzer Agent** scans the document to find "Learning Objectives".
3.  **Generation**: The **Question Generator Agent** creates questions for each objective, utilizing the `get_pdf_info` tool to reference source text.
4.  **Review**: The **Quality Analyzer Agent** (optional pipeline) scores the output.
5.  **Study**: The user takes the test.
6.  **Feedback**: Upon completion, the **Result Analyzer Agent** reviews performance, searches the web for resources, and generates a study plan.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (optional, for containerized deployment)
- Google Cloud Project with Vertex AI and GCS enabled

### Installation

```bash
# Install dependencies
npm install

# Start development environment
./run.sh
```

The `./run.sh` script automates the entire startup process:

1.  Starts the **Backend** (NestJS).
2.  Waits for the OpenAPI spec to be generated.
3.  **Automatically runs codegen** to update the Frontend SDK.
4.  Starts the **Frontend** (Next.js).

_Note: It may take a few seconds for the SDK types to generate before the frontend starts._

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **Swagger Docs**: http://localhost:3000/api

## 💻 Development Workflow

### SDK Generation

Our frontend client is auto-generated from the backend controller definitions. This ensures type safety across the stack.

The `./run.sh` script handles this automatically on startup. If you make changes to Backend Controllers while developing:

```bash
# Regenerate SDK manually
cd packages/web
npm run codegen
```

This generates typed API clients (in `packages/web/src/generated`) that you can use immediately:

```typescript
import { getPdfsApi } from "@/api-client";

const api = getPdfsApi();
const myPdfs = await api.pdfsControllerListPdfs();
```

### Database

```bash
cd packages/api
npx prisma studio  # View data
npx prisma generate # Update client after schema changes
```

## ☁️ Deployment

The project is configured for **Google Cloud Run**.

- **CI/CD**: GitHub Actions workflows (`deploy.yml`) handle automated deployment.
- **Build**: Uses **Cloud Build** to build Docker images from the root context.
- **Run**: Deploys separate services for API and Web to Cloud Run.

## 📝 License

MIT
