sequenceDiagram
    participant U as User
    participant API as NestJS API
    participant PS as Parallel Service
    participant TP as Task Parser
    participant GCS as Google Cloud Storage
    participant QG as Question Generators (Pool)
    participant QA as Quality Analyzer
    participant DB as Database
    participant TA as Test Analyzer
    
    %% Phase 1: Initiation
    Note over U,TP: Phase 1: Request Processing
    U->>API: Upload PDF & Request Generation
    API->>GCS: Store PDF
    API->>PS: Initialize Parallel Generation
    PS->>TP: Parse User Prompt
    TP-->>PS: Task Distribution (Easy/Medium/Hard batches)
    
    %% Phase 2: Parallel Generation
    Note over PS,DB: Phase 2: Parallel Execution
    
    par Parallel Generation Streams
        PS->>QG: Spawn Easy Questions Agent
        PS->>QG: Spawn Medium Questions Agent
        PS->>QG: Spawn Hard Questions Agent
    end
    
    loop Each Agent Execution
        QG->>GCS: get_pdf_info() - Extract Context
        GCS-->>QG: PDF Text & Metadata
        QG->>QG: Generate Questions per Difficulty
        
        opt Web Enrichment
            QG->>QG: fetch_url_content() - Get external info
        end
        
        QG->>DB: save_objective() - Persist Data
        DB-->>QG: Confirmation
    end
    
    QG-->>PS: All Streams Completed
    
    %% Phase 3: Quality Review
    Note over PS,QA: Phase 3: Quality Assurance
    PS->>QA: Trigger Quality Analysis
    QA->>DB: Fetch All Generated Questions
    DB-->>QA: Question Set
    QA->>QA: Analyze & Score Quality
    QA-->>PS: Quality Report
    
    PS-->>API: Generation Complete + Summary
    API-->>U: Ready for Study
    
    %% Phase 4: Study & Analysis
    Note over U,TA: Phase 4: Learning Loop
    U->>API: Submit Test Results
    API->>TA: Analyze Performance
    
    TA->>GCS: get_pdf_info() - Context Retrieval
    TA->>TA: Identify Knowledge Gaps
    
    opt Resource Gathering
        TA->>TA: Web Search for Study Materials
    end
    
    TA-->>API: Personalized Study Plan
    API-->>U: Feedback & Recommendations
