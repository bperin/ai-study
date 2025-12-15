graph TD
    %% Agent Ecosystem Overview
    subgraph "Parallel Orchestration"
        Orchestrator[Parallel Generation Service]
        Orchestrator_Task[• Parses user prompt<br/>• Determines difficulty distribution<br/>• Chunks large requests<br/>• Manages parallel execution]
    end
    
    subgraph "Generation Agents"
        QG_Easy[Question Generator (Easy)<br/>Gemini Flash]
        QG_Medium[Question Generator (Medium)<br/>Gemini Flash]
        QG_Hard[Question Generator (Hard)<br/>Gemini Flash]
        
        QG_Tasks[• Generates MCQs per difficulty<br/>• Validates against PDF context<br/>• Creates explanations & hints]
        QG_Tools[Tools:<br/>get_pdf_info<br/>save_objective<br/>fetch_url_content]
    end
    
    subgraph "Quality Assurance"
        QA[Quality Analyzer<br/>Gemini Flash]
        QA_Tasks[• Reviews all generated questions<br/>• Checks coverage & accuracy<br/>• Generates quality summary]
    end
    
    subgraph "Interactive Agents"
        TestChat[Test Assistant<br/>Gemini Flash]
        TestChat_Tasks[• Provides hints during tests<br/>• Explains concepts without solving]
        
        PlanChat[Test Plan Chat<br/>Gemini Flash]
        PlanChat_Tasks[• Helps create study schedules<br/>• Discusses learning goals]
    end
    
    subgraph "Analysis Agents"
        TA[Test Analyzer<br/>Gemini Flash]
        TA_Tasks[• Analyzes missed questions<br/>• Identifies knowledge gaps<br/>• Suggests web resources]
        TA_Tools[Tools:<br/>get_pdf_info<br/>fetch_url_content]
    end
    
    subgraph "Visual Agent"
        IG[Image Generator<br/>Imagen 3]
        IG_Tasks[• Generates educational images<br/>• Creates visual flashcards]
    end
    
    %% Orchestration Flow
    Orchestrator -->|Distributes Tasks| QG_Easy
    Orchestrator -->|Distributes Tasks| QG_Medium
    Orchestrator -->|Distributes Tasks| QG_Hard
    
    %% Post-Generation Flow
    QG_Easy & QG_Medium & QG_Hard -->|Completion| QA
    QA -->|Report| Orchestrator
    
    %% Tool Connections
    QG_Easy --> QG_Tools
    QG_Medium --> QG_Tools
    QG_Hard --> QG_Tools
    TA --> TA_Tools
    
    %% Clean Black & White Styling
    classDef orchestrator fill:#ffffff,stroke:#000000,stroke-width:3px,color:#000000
    classDef generator fill:#e8e8e8,stroke:#000000,stroke-width:2px,color:#000000
    classDef quality fill:#f0f0f0,stroke:#000000,stroke-width:2px,color:#000000
    classDef interactive fill:#e0e0e0,stroke:#000000,stroke-width:2px,color:#000000
    classDef visual fill:#d8d8d8,stroke:#000000,stroke-width:2px,color:#000000
    classDef tool fill:#ffffff,stroke:#666666,stroke-width:1px,color:#000000
    
    class Orchestrator,Orchestrator_Task orchestrator
    class QG_Easy,QG_Medium,QG_Hard,QG_Tasks,TA,TA_Tasks generator
    class QA,QA_Tasks quality
    class TestChat,TestChat_Tasks,PlanChat,PlanChat_Tasks interactive
    class IG,IG_Tasks visual
    class QG_Tools,TA_Tools tool
