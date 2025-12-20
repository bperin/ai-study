# System Architecture

```mermaid
graph TB
    %% User Layer
    User[User] --> Frontend[Next.js Frontend]

    %% Application Layer
    subgraph "Application Layer"
        Frontend --> API[NestJS API]
        API --> Workers[BullMQ Workers]
    end

    %% Data & Storage Layer
    subgraph "Data & Storage"
        API --> DB[(PostgreSQL + pgvector)]
        Workers --> DB
        API --> Redis[(Redis)]
        Workers --> Redis
    end

    %% Cloud Infrastructure
    subgraph "Google Cloud Platform"
        API --> GCS[Cloud Storage]
        Workers --> Vertex[Vertex AI]
        Workers --> Gemini[Gemini 1.5 Pro/Flash]
    end

    %% Relationships
    Workers --> GCS
