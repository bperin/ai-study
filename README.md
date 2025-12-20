# AI Study

**A study tool that converts PDFs into interactive flashcards.**

## Overview

This project uses Google Gemini to help students review material. It breaks down PDFs into key concepts and generates multiple-choice questions for self-testing.

**Important Note**: Currently, only text-based PDFs are supported for processing. PDFs consisting solely of images will not be processed correctly. Implementing support for image-based PDFs would require integration with an image analysis model.

**Future Enhancements**: The next steps for this project involve building a true knowledge graph for more sophisticated concept relationships and personalized learning paths.

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

### 🤖 Multi-Agent AI Architecture

AI Study leverages **Google's ADK (Agent Development Kit)** with multiple specialized AI agents powered by **Gemini 2.5 Flash** models. Each agent has specific responsibilities and tools to create a comprehensive learning experience.

#### RAG Implementation (In Progress)
- **Ingestion**: Uploaded PDFs are automatically chunked and embedded using Vertex AI `text-embedding-004`.
- **Generation**: Currently falls back to injecting the full PDF text (up to 125k tokens / 500k chars) into the prompt context for Flashcard Generation and Test Planning.
- **Chat Assistance**: Uses RAG retrieval to find relevant chunks for answering specific questions, falling back to PDF text if no chunks are found.
- **Known Issues**: The ADK runner may occasionally error out due to session management, in which case the system gracefully falls back to direct Gemini API calls.

<details open>
<summary><b>System Architecture Diagrams</b></summary>

| Diagram Type | Visualization |
|---|---|
| **System Architecture** | ![System Architecture](./docs/ai-study-architecture.png) |
| **Agent Details** | ![Agent Details](./docs/ai-study-agent-details.png) |
| **Data Flow** | ![Data Flow](./docs/ai-study-data-flow.png) |
| **Workflow Sequence** | ![Workflow Sequence](./docs/ai-study-workflow.png) |
| **RAG Sequence** | ![RAG Sequence](./docs/ai-study-rag-sequence.png) |

</details>

#### 🎭 Agent Ecosystem

**Root Orchestrator Agent**
- Coordinates the entire flashcard generation workflow
- Parses user requests and manages agent delegation
- Ensures completion and quality across all phases

**Content Analyzer Agent**
- Analyzes PDF content to identify key learning objectives
- Categorizes concepts by difficulty level (easy, medium, hard)
- Maps relationships between concepts and topics

**Question Generator Agent**
- Creates high-quality multiple choice questions
- Generates explanations and helpful hints
- Uses tools to reference PDF content and web resources

**Quality Analyzer Agent**
- Reviews generated flashcards for educational value
- Validates technical quality and content accuracy
- Provides comprehensive coverage analysis

**Image Generator Agent**
- Creates educational images for visual flashcards
- Generates diagrams and illustrations using Imagen 3
- Supports picture-based questions for enhanced learning

**Test Analyzer Agent**
- Analyzes student performance patterns
- Identifies knowledge gaps and learning opportunities
- Creates personalized study plans with web-sourced resources

#### 🔧 AI Tools & Capabilities

Each agent has access to specialized tools:

- **`get_pdf_info`**: Extracts and processes PDF content
- **`save_objective`**: Stores learning objectives and questions in database
- **`fetch_url_content`**: Searches web for additional educational resources
- **`complete_generation`**: Finalizes and validates the generation process

#### 📊 Multi-Agent Workflow

1.  **PDF Upload & Processing**: Secure storage and text extraction
2.  **Content Analysis**: AI identifies learning objectives and key concepts
3.  **Question Generation**: Creates targeted MCQ questions with explanations
4.  **Quality Assurance**: Reviews and validates educational content
5.  **Visual Enhancement**: Generates images for picture-based questions
6.  **Study Session**: Interactive testing with real-time feedback
7.  **Performance Analysis**: AI analyzes results and creates study plans

The system processes data through multiple stages:
- **Input Processing**: PDF parsing and user request analysis
- **AI Processing**: Multi-agent content analysis and generation
- **Storage**: Structured data storage in PostgreSQL
- **Enhancement**: Web search and image generation
- **Output**: Interactive study sessions and personalized feedback

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL** database (local or cloud)
- **Google Cloud Project** with the following APIs enabled:
  - Vertex AI API
  - Cloud Storage API
  - Cloud Build API (for deployment)
- **Environment Variables** (see Configuration section)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ai-study
npm install
```

2. **Set up environment variables:**
```bash
# Copy example environment files
cp packages/api/.env.example packages/api/.env
cp .env.example .env

# Edit the .env files with your configuration
```

3. **Set up the database:**
```bash
cd packages/api
npx prisma migrate dev
npx prisma generate
```

4. **Start development environment:**
```bash
# From project root
./run.sh
```

The `./run.sh` script automates the entire startup process:

1. Starts the **Backend** (NestJS) on port 3000
2. Waits for the OpenAPI spec to be generated
3. **Automatically runs codegen** to update the Frontend SDK
4. Starts the **Frontend** (Next.js) on port 3001

### Access Points

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api
- **Database Studio**: `npm run start:studio`

## ⚙️ Configuration

### Required Environment Variables

**Backend (`packages/api/.env`):**
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_study"

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GCP_SA_KEY="your-service-account-key-json"
GCS_BUCKET_NAME="your-storage-bucket"

# AI Services
GEMINI_API_KEY="your-gemini-api-key"

# Application
JWT_SECRET="your-jwt-secret"
PORT=3000
```

**Root (`.env`):**
```bash
# Development settings
NODE_ENV=development
```

### Google Cloud Setup

1. **Create a Google Cloud Project**
2. **Enable required APIs:**
   - Vertex AI API
   - Cloud Storage API
3. **Create a service account** with the following roles:
   - **Vertex AI User** (`roles/aiplatform.user`): For Gemini model access
   - **Storage Admin** (`roles/storage.admin`): For managing PDF buckets
   - **Service Account User** (`roles/iam.serviceAccountUser`): For service identity
   - **Cloud Run Admin** (`roles/run.admin`): For deployment management
   - **Artifact Registry Admin** (`roles/artifactregistry.admin`): For container image management
   - **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`): To use enabled APIs
4. **Download the service account key** and set it in `GCP_SA_KEY`
5. **Create a Cloud Storage bucket** for PDF storage

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

## 🔧 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `packages/api/.env`
- Run `npx prisma migrate dev` to set up the database

**"Google Cloud authentication failed"**
- Verify `GCP_SA_KEY` contains valid service account JSON
- Ensure required APIs are enabled in Google Cloud Console
- Check service account has correct permissions

**"Frontend types are missing"**
- Run `cd packages/web && npm run codegen`
- Ensure backend is running and OpenAPI spec is generated
- Check that `packages/api/openapi.json` exists

**"Port already in use"**
- Kill existing processes: `pkill -f "node.*3000|3001"`
- Or change ports in environment variables

### Performance Tips

- Use `npm run start:studio` to monitor database queries
- Check Cloud Storage CORS configuration if uploads fail
- Monitor Vertex AI quotas in Google Cloud Console

## 📚 API Documentation

### REST API
- **Swagger UI**: http://localhost:3000/api
- **OpenAPI Spec**: `packages/api/openapi.json`

### Key Endpoints
- `POST /pdfs/upload` - Upload PDF for processing
- `POST /tests/generate` - Generate flashcards from PDF
- `GET /tests/:id/questions` - Get questions for study session
- `POST /tests/:id/submit` - Submit test answers
- `GET /tests/:id/analysis` - Get performance analysis

### TypeScript SDK
Auto-generated client available in `packages/web/src/generated/`:
```typescript
import { getPdfsApi, getTestsApi } from "@/api-client";

// Upload PDF
const pdfsApi = getPdfsApi();
const uploadResult = await pdfsApi.pdfsControllerUpload(file);

// Generate flashcards
const testsApi = getTestsApi();
const test = await testsApi.testsControllerGenerate({
  pdfId: uploadResult.id,
  difficulty: 'medium',
  questionCount: 20
});
```

## 🚀 Production Deployment

### Google Cloud Run

The project includes automated deployment via GitHub Actions:

1. **Set up secrets** in GitHub repository:
   ```
   GCP_SA_KEY - Service account JSON key
   GCP_PROJECT_ID - Google Cloud project ID
   ```

2. **Deploy via GitHub Actions:**
   ```bash
   git push origin main  # Triggers deployment
   ```

3. **Manual deployment:**
   ```bash
   ./deploy.sh  # Builds and deploys both services
   ```

### Environment Variables (Production)
Set these in Cloud Run service configuration:
- `DATABASE_URL` - Production PostgreSQL connection
- `GCP_SA_KEY` - Service account key
- `GEMINI_API_KEY` - Vertex AI API key
- `JWT_SECRET` - Strong random secret
- `GCS_BUCKET_NAME` - Production storage bucket

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow the installation steps above
4. Make your changes and test thoroughly
5. Run linting: `npm run lint --workspaces`
6. Submit a pull request

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Write tests for new features

### Database Changes
1. Modify `packages/api/prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name descriptive_name`
3. Update seed data if needed: `packages/api/prisma/seed.ts`

## 📊 Monitoring & Analytics

### Health Checks
- **API Health**: http://localhost:3000/health
- **Database**: Prisma connection status in logs
- **AI Services**: Vertex AI quota usage in GCP Console

### Logging
- Backend logs: NestJS structured logging
- Frontend: Browser console and Next.js logs
- Production: Cloud Logging in Google Cloud Console

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## � TODOs & Future Enhancements

### Planned Features
- **Enhanced Leaderboard & Gamification**: Full competitive features with badges, achievements, and ranking systems
- **Real-time Question Delivery**: Pub/Sub service for creating and answering questions with always-available delivery
- **Multimedia Questions**: Support for image and video-based questions to enhance learning experience
- **Advanced Analytics**: Deeper performance tracking and personalized learning paths

### Weekend Goals
- Image and video question support implementation
- Pub/Sub service architecture for real-time features

## �🙏 Acknowledgments

- **Google Vertex AI** for powerful language models
- **NestJS** for robust backend architecture
- **Next.js** for modern frontend development
- **Prisma** for type-safe database operations
