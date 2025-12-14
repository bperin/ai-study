flowchart TD
    %% Input Sources
    PDF[PDF Document] --> GCS[Google Cloud Storage]
    UserReq[User Request<br/>• Difficulty focus<br/>• Question count<br/>• Topic guidance] --> API[NestJS API]
    
    %% PDF Processing
    GCS --> PDFTool[get_pdf_info Tool]
    PDFTool --> TextExtract[Text Extraction<br/>• Structured text service<br/>• PDF Parse fallback<br/>• Character limiting]
    
    %% Parallel Generation Engine
    API --> ParallelSvc[ParallelGenerationService]
    TextExtract --> ParallelSvc
    
    %% Task Distribution
    ParallelSvc --> TaskParsing[Task Parser<br/>• Determine difficulty split<br/>• Chunk large requests]
    
    TaskParsing -->|Easy Batch| AgentEasy[Question Generator (Easy)]
    TaskParsing -->|Medium Batch| AgentMedium[Question Generator (Medium)]
    TaskParsing -->|Hard Batch| AgentHard[Question Generator (Hard)]
    
    %% Agent Execution & Data Creation
    AgentEasy & AgentMedium & AgentHard --> SaveTool[save_objective Tool]
    
    SaveTool --> Database[(PostgreSQL<br/>• Objectives table<br/>• MCQs table)]
    
    %% Web Enhancement
    AgentEasy & AgentMedium & AgentHard --> WebSearch[Web Search Tool]
    WebSearch --> ExternalData[External Resources]
    
    %% Quality Loop
    Database --> QualityCheck[Quality Analyzer]
    QualityCheck --> QualityReport[Quality Summary]
    QualityReport --> ParallelSvc
    
    %% Study Session & Analytics
    Database --> StudySession[Study Session]
    StudySession --> TestAttempt[Test Attempt Record]
    TestAttempt --> Database
    
    TestAttempt --> TestAnalyzer[Test Analyzer Agent]
    TestAnalyzer --> WebSearch
    TestAnalyzer --> PDFTool
    TestAnalyzer --> StudyPlan[Personalized Study Plan]
    
    %% Interactive Chat
    StudySession --> TestChat[Test Assistant Chat]
    StudyPlan --> PlanChat[Study Plan Chat]
    
    %% Output
    StudyPlan --> Frontend[Next.js Frontend]
    QualityReport --> Frontend
    Database --> Frontend
    
    %% Data Types Legend
    subgraph "📊 Data Types"
        direction TB
        RawData[Raw PDF Text]
        StructData[Structured Objectives]
        QuestData[MCQ Questions]
        ReportData[Analysis Reports]
    end
    
    %% Clean Black & White Styling
    classDef input fill:#ffffff,stroke:#000000,stroke-width:2px,color:#000000
    classDef processing fill:#f0f0f0,stroke:#000000,stroke-width:2px,color:#000000
    classDef storage fill:#e8e8e8,stroke:#000000,stroke-width:3px,color:#000000
    classDef output fill:#ffffff,stroke:#333333,stroke-width:2px,color:#000000
    classDef enhancement fill:#f8f8f8,stroke:#666666,stroke-width:1px,color:#000000
    
    class PDF,UserReq,GCS input
    class PDFTool,TextExtract,ParallelSvc,TaskParsing,AgentEasy,AgentMedium,AgentHard,QualityCheck,TestAnalyzer,TestChat,PlanChat processing
    class Database,TestAttempt storage
    class Frontend,StudySession,StudyPlan,QualityReport output
    class WebSearch,ExternalData enhancement
