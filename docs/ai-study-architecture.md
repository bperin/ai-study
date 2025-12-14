graph TB
    %% User Input Layer
    User[User] --> Upload[PDF Upload]
    User --> Request[Generation Request]
    
    %% Infrastructure Layer
    Upload --> GCS[Google Cloud Storage]
    Request --> API[NestJS API]
    
    %% Service Layer
    API --> ParallelService[ParallelGenerationService<br/>Orchestrator]
    API --> AdkService[AdkRunnerService<br/>Agent Runtime]
    
    %% AI Agent Layer
    ParallelService --> QG_Easy[Question Generator (Easy)<br/>Gemini Flash]
    ParallelService --> QG_Medium[Question Generator (Medium)<br/>Gemini Flash]
    ParallelService --> QG_Hard[Question Generator (Hard)<br/>Gemini Flash]
    ParallelService --> QualityAnalyzer[Quality Analyzer Agent<br/>Gemini Flash]
    
    %% Interactive Agents
    AdkService --> TestPlanAgent[Test Plan Chat Agent]
    AdkService --> TestAssistAgent[Test Assistant Agent]
    AdkService --> ImageGenerator[Image Generator Agent<br/>Imagen 3]

    %% Tools Layer
    subgraph "AI Tools"
        GetPdfTool[get_pdf_info Tool]
        SaveObjectiveTool[save_objective Tool]
        WebSearchTool[fetch_url_content Tool]
    end

    QG_Easy --> SaveObjectiveTool
    QG_Easy --> WebSearchTool
    QG_Medium --> SaveObjectiveTool
    QG_Medium --> WebSearchTool
    QG_Hard --> SaveObjectiveTool
    QG_Hard --> WebSearchTool
    
    TestAssistAgent --> GetPdfTool
    QualityAnalyzer --> GetPdfTool
    
    %% Data Layer
    GetPdfTool --> GCS
    SaveObjectiveTool --> Database[(PostgreSQL Database)]
    WebSearchTool --> Internet[Internet Resources]
    
    %% Storage Layer
    Database --> Objectives[Learning Objectives]
    Database --> Questions[MCQ Questions]
    Database --> TestAttempts[Test Attempts]
    
    %% Output Layer
    Objectives --> Frontend[Next.js Frontend]
    Questions --> Frontend
    TestAttempts --> Frontend
    Frontend --> StudySession[Interactive Study Session]
    
    %% Clean Black & White Styling
    classDef userLayer fill:#ffffff,stroke:#000000,stroke-width:2px,color:#000000
    classDef infraLayer fill:#f8f8f8,stroke:#000000,stroke-width:2px,color:#000000
    classDef serviceLayer fill:#e8e8e8,stroke:#000000,stroke-width:2px,color:#000000
    classDef agentLayer fill:#dddddd,stroke:#000000,stroke-width:1px,color:#000000
    classDef toolLayer fill:#ffffff,stroke:#666666,stroke-width:1px,color:#000000
    classDef dataLayer fill:#f0f0f0,stroke:#000000,stroke-width:2px,color:#000000
    classDef outputLayer fill:#ffffff,stroke:#333333,stroke-width:2px,color:#000000
    
    class User,Upload,Request userLayer
    class GCS,API infraLayer
    class ParallelService,AdkService serviceLayer
    class QG_Easy,QG_Medium,QG_Hard,QualityAnalyzer,TestPlanAgent,TestAssistAgent,ImageGenerator agentLayer
    class GetPdfTool,SaveObjectiveTool,WebSearchTool toolLayer
    class Database,Objectives,Questions,TestAttempts dataLayer
    class Frontend,StudySession outputLayer
