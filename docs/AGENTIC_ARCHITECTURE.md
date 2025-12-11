# AI Study - Agentic Architecture

## Overview

This document outlines the two-agent system architecture for the AI Study application. The system is designed around human-in-the-loop workflows with two distinct root agents:

1. **Test Setup Agent** - Orchestrates flashcard generation with user collaboration
2. **Test Taking Agent** - Manages the test experience and provides intelligent feedback

---

## 🎯 Agent 1: Test Setup Agent

### Purpose

Collaboratively create personalized study tests from PDF materials with full human oversight and customization.

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Setup Flow                          │
└─────────────────────────────────────────────────────────────┘

1. PDF Upload
   ↓
2. User Provides Free-Form Preferences
   ↓
3. Agent Analyzes PDF + Preferences → Proposes Plan
   ↓
4. Human Reviews Plan (HITL Checkpoint)
   ├─ Approve → Continue
   ├─ Modify → Agent Adjusts Plan → Back to Review
   └─ Reject → Start Over
   ↓
5. Agent Generates Flashcards
   ↓
6. Test Configuration Ready
```

### User Preferences (Free-Form Input)

Users can specify any combination of:

- **Difficulty Level**: Easy, Medium, Hard, or Mixed
- **Number of Questions**: Total questions to generate
- **Question Types**: Multiple choice, True/False, Fill-in-blank
- **Picture Cards**: Include visual questions (AI-generated images)
- **Focus Areas**: Specific topics or chapters to emphasize
- **Time Limit**: Suggested time for test completion
- **Question Distribution**: How to spread questions across topics
- **Custom Instructions**: Any other special requirements

### Plan Proposal Structure

The agent will propose a plan containing:

```typescript
interface TestPlan {
    summary: string; // Overview of the plan
    pdfAnalysis: {
        filename: string;
        mainTopics: string[];
        estimatedDifficulty: string;
        pageCount?: number;
    };
    objectives: {
        title: string;
        difficulty: "easy" | "medium" | "hard";
        questionCount: number;
        includesPictures: boolean;
        topics: string[];
    }[];
    totalQuestions: number;
    estimatedTime: number; // minutes
    pictureCardsCount: number;
    rationale: string; // Why this plan fits user's needs
}
```

### Human-in-the-Loop (HITL) Interaction

The agent will:

1. Present the plan in a clear, readable format
2. Ask for explicit approval: "Does this plan look good to you?"
3. Accept feedback in natural language
4. Adjust the plan based on feedback
5. Re-present for approval (iterative)

### Database Schema Extensions

```prisma
model PdfSession {
  id              String   @id @default(uuid())
  pdfId           String
  pdf             Pdf      @relation(fields: [pdfId], references: [id])
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  // User preferences
  userPreferences Json     // Free-form preferences

  // Plan proposal
  proposedPlan    Json?    // TestPlan structure
  planStatus      String   @default("pending") // pending, approved, rejected
  planIterations  Int      @default(0)

  // Configuration
  difficulty      String?
  totalQuestions  Int?
  includePictures Boolean  @default(false)
  pictureCount    Int      @default(0)
  timeLimit       Int?     // minutes

  // Status
  status          String   @default("planning") // planning, generating, ready, completed

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Mcq {
  id           String   @id @default(uuid())
  question     String
  options      String[]
  correctIdx   Int
  explanation  String?
  hint         String?
  externalLink String?

  // New fields
  hasPicture   Boolean  @default(false)
  pictureUrl   String?  // GCS URL for AI-generated image
  picturePrompt String? // Prompt used to generate image

  objectiveId  String
  objective    Objective @relation(fields: [objectiveId], references: [id])
  userAnswers  UserAnswer[]
}
```

### Tools for Test Setup Agent

```typescript
// Existing tools
-get_pdf_info() -
    save_objective() -
    complete_generation() -
    // New tools needed
    analyze_pdf_content() - // Extract topics, structure
    propose_test_plan() - // Create plan based on preferences
    generate_picture_card() - // Create AI image for question
    save_session_preferences() - // Store user preferences
    update_plan_status(); // Track HITL approval
```

---

## 🎓 Agent 2: Test Taking Agent

### Purpose

Deliver an intelligent, adaptive test-taking experience with comprehensive feedback and learning insights.

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Taking Flow                         │
└─────────────────────────────────────────────────────────────┘

1. Load Test Configuration
   ↓
2. Present Questions Sequentially
   ├─ Show question + options
   ├─ (Optional) Show hint on request
   └─ (Optional) Display picture card
   ↓
3. Collect User Answers
   ├─ Track time per question
   ├─ Allow navigation (if enabled)
   └─ Save progress continuously
   ↓
4. Complete Test
   ↓
5. Analyze Performance
   ├─ Calculate score
   ├─ Identify weak areas
   ├─ Generate insights
   └─ Provide critical feedback
   ↓
6. Present Results Dashboard
```

### In-Memory State Management

The Test Taking Agent maintains session state in memory to provide context-aware interactions:

```typescript
interface TestSessionState {
    attemptId: string;
    userId: string;
    currentQuestionIndex: number;
    totalQuestions: number;

    // Answer tracking
    answers: {
        questionId: string;
        questionNumber: number;
        questionText: string;
        selectedAnswer: number;
        correctAnswer: number;
        isCorrect: boolean;
        timeSpent: number;
        hintsUsed: number;
    }[];

    // Real-time performance metrics
    correctCount: number;
    incorrectCount: number;
    currentStreak: number; // Consecutive correct answers
    longestStreak: number;

    // Topic performance (live tracking)
    topicScores: Map<
        string,
        {
            correct: number;
            total: number;
            objectiveTitle: string;
        }
    >;

    // Timing
    startTime: Date;
    totalTimeSpent: number; // seconds

    // Engagement
    totalHintsUsed: number;
    questionsSkipped: number;
}
```

### Bracket Notation for Prompt References

The agent uses bracket notation to reference state in prompts:

```typescript
// Available references in agent prompts:
[CURRENT_SCORE][CORRECT_COUNT][INCORRECT_COUNT][CURRENT_STREAK][PROGRESS][TIME_ELAPSED][LAST_ANSWER][WEAK_TOPICS][STRONG_TOPICS][HINTS_USED][CURRENT_TOPIC][TOPIC_PERFORMANCE]; // e.g., "15/20" // e.g., "15" // e.g., "5" // e.g., "3" (consecutive correct) // e.g., "Question 16 of 20" // e.g., "12 minutes" // "correct" or "incorrect" // e.g., "Genetics, Cell Division" // e.g., "Photosynthesis, Respiration" // e.g., "3" // e.g., "Photosynthesis" // e.g., "3/4 correct in this topic"
```

### Dynamic Prompt Examples

The agent adapts its prompts based on state:

```typescript
// After correct answer
const correctPrompts = ["Excellent! [CURRENT_STREAK] in a row! 🎯 [PROGRESS]", "That's right! You're doing great on [CURRENT_TOPIC]. [TOPIC_PERFORMANCE]", "Correct! [CURRENT_SCORE] so far. Keep it up! 💪"];

// After incorrect answer
const incorrectPrompts = ["Not quite. Don't worry, you're still at [CURRENT_SCORE]. Let's keep going!", "That's okay! [CURRENT_TOPIC] can be tricky. [PROGRESS]", "Close! You've got [CORRECT_COUNT] right so far. Next question..."];

// Encouraging messages based on performance
if (state.correctCount / state.totalQuestions > 0.8) {
    prompt = "You're crushing it! [CURRENT_SCORE] 🌟";
} else if (state.currentStreak >= 5) {
    prompt = "Amazing streak of [CURRENT_STREAK]! Keep the momentum! 🔥";
} else if (state.incorrectCount > state.correctCount) {
    prompt = "Hang in there! Every question is a learning opportunity. [PROGRESS]";
}
```

### Question Presentation

The agent provides:

- **Context-Aware Prompts**: Encouraging messages based on progress (using bracket notation)
- **Adaptive Hints**: Intelligent hints that don't give away answers
- **Progress Tracking**: "Question 5 of 20" with time elapsed
- **Visual Elements**: Display picture cards when applicable
- **Performance Feedback**: Real-time updates on correct/incorrect answers

### Answer Collection

Track for each question:

```typescript
interface QuestionAttempt {
    mcqId: string;
    questionNumber: number;
    timeSpent: number; // seconds
    hintsUsed: number;
    selectedAnswer: number;
    isCorrect: boolean;
    confidence?: number; // Optional: user self-rating
}
```

### Performance Analysis

After test completion, the agent analyzes:

1. **Overall Performance**
    - Total score (percentage)
    - Time taken vs. estimated time
    - Questions correct on first try

2. **Topic-Level Analysis**
    - Performance by learning objective
    - Difficulty level breakdown
    - Identify strongest/weakest areas

3. **Question-Level Insights**
    - Which questions took longest
    - Common wrong answers (patterns)
    - Questions where hints were used

### Critical Feedback Generation

The agent provides:

```typescript
interface TestFeedback {
    score: {
        correct: number;
        total: number;
        percentage: number;
    };

    strengths: string[]; // Topics/areas where user excelled
    weaknesses: string[]; // Areas needing improvement

    recommendations: {
        topic: string;
        reason: string;
        suggestedAction: string; // "Review chapter 3", "Practice more on..."
    }[];

    detailedAnalysis: {
        byDifficulty: {
            easy: { correct: number; total: number };
            medium: { correct: number; total: number };
            hard: { correct: number; total: number };
        };
        byObjective: {
            objectiveTitle: string;
            correct: number;
            total: number;
            percentage: number;
        }[];
    };

    wrongAnswers: {
        question: string;
        yourAnswer: string;
        correctAnswer: string;
        explanation: string;
        whyYouMightHaveChosen: string; // AI insight into common misconception
    }[];

    encouragement: string; // Personalized motivational message
    nextSteps: string[]; // Concrete actions to improve
}
```

### Database Schema Extensions

```prisma
model TestAttempt {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  pdfId       String
  pdf         Pdf      @relation(fields: [pdfId], references: [id])

  // Session info
  sessionId   String?  // Link to PdfSession if applicable

  // Performance
  score       Int
  total       Int
  percentage  Float

  // Timing
  startedAt   DateTime @default(now())
  completedAt DateTime?
  totalTime   Int?     // seconds

  // Analysis (stored as JSON for flexibility)
  feedback    Json?    // TestFeedback structure

  answers     UserAnswer[]
}

model UserAnswer {
  id          String      @id @default(uuid())
  attemptId   String
  attempt     TestAttempt @relation(fields: [attemptId], references: [id])
  mcqId       String
  mcq         Mcq         @relation(fields: [mcqId], references: [id])

  // Answer details
  selectedIdx Int
  isCorrect   Boolean

  // Engagement metrics
  timeSpent   Int         @default(0)  // seconds
  hintsUsed   Int         @default(0)
  confidence  Int?        // 1-5 scale (optional)

  createdAt   DateTime    @default(now())
}
```

### Tools for Test Taking Agent

```typescript
// State Management
-initialize_test_session() - // Create in-memory state
    get_session_state() - // Retrieve current state
    update_session_state() - // Update state values
    // Question Management
    load_test_questions() - // Get all questions for a test
    get_next_question() - // Get next question with state context
    record_answer() - // Save answer + update state
    // Interaction
    provide_hint() - // Generate contextual hint
    get_encouragement() - // Get dynamic prompt using [BRACKETS]
    // Analysis
    calculate_score() - // Compute final score
    analyze_performance() - // Deep analysis of results
    generate_feedback() - // Create personalized feedback
    identify_weak_areas() - // Find topics needing review
    suggest_next_steps(); // Recommend study actions
```

### State Management Tool Implementation

```typescript
// Tool: record_answer
// This tool updates in-memory state AND persists to database
const recordAnswerTool = new FunctionTool({
    name: "record_answer",
    description: "Records the user's answer and updates session state",
    parameters: z.object({
        questionId: z.string(),
        selectedAnswer: z.number(),
        timeSpent: z.number(),
    }),
    execute: async (params, context) => {
        const state = context.sessionState as TestSessionState;
        const question = await getQuestion(params.questionId);

        const isCorrect = params.selectedAnswer === question.correctIdx;

        // Update in-memory state
        state.answers.push({
            questionId: params.questionId,
            questionNumber: state.currentQuestionIndex + 1,
            questionText: question.question,
            selectedAnswer: params.selectedAnswer,
            correctAnswer: question.correctIdx,
            isCorrect,
            timeSpent: params.timeSpent,
            hintsUsed: 0, // tracked separately
        });

        if (isCorrect) {
            state.correctCount++;
            state.currentStreak++;
            state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
        } else {
            state.incorrectCount++;
            state.currentStreak = 0;
        }

        // Update topic performance
        const topicKey = question.objective.id;
        const topicScore = state.topicScores.get(topicKey) || {
            correct: 0,
            total: 0,
            objectiveTitle: question.objective.title,
        };
        topicScore.total++;
        if (isCorrect) topicScore.correct++;
        state.topicScores.set(topicKey, topicScore);

        state.currentQuestionIndex++;
        state.totalTimeSpent += params.timeSpent;

        // Persist to database (async, non-blocking)
        await saveAnswerToDb({
            attemptId: state.attemptId,
            mcqId: params.questionId,
            selectedIdx: params.selectedAnswer,
            isCorrect,
            timeSpent: params.timeSpent,
        });

        // Return state-aware response
        return {
            isCorrect,
            currentScore: `${state.correctCount}/${state.answers.length}`,
            currentStreak: state.currentStreak,
            progress: `${state.currentQuestionIndex}/${state.totalQuestions}`,
            encouragement: generateEncouragement(state),
        };
    },
});

// Tool: get_encouragement
// Generates dynamic prompts with bracket substitution
const getEncouragementTool = new FunctionTool({
    name: "get_encouragement",
    description: "Get an encouraging message based on current performance",
    execute: async (params, context) => {
        const state = context.sessionState as TestSessionState;

        // Select appropriate prompt template
        let template: string;

        if (state.currentStreak >= 5) {
            template = "🔥 On fire! [CURRENT_STREAK] correct in a row! [PROGRESS]";
        } else if (state.correctCount / state.answers.length > 0.8) {
            template = "⭐ Excellent work! [CURRENT_SCORE] - you're mastering this!";
        } else if (state.answers.length > 0 && state.answers[state.answers.length - 1].isCorrect) {
            template = "✅ Correct! [CURRENT_SCORE]. [PROGRESS]";
        } else if (state.incorrectCount > state.correctCount) {
            template = "Keep going! Learning from mistakes is progress. [PROGRESS]";
        } else {
            template = "Nice! [CURRENT_SCORE]. [PROGRESS]";
        }

        // Substitute brackets with actual values
        return substituteBrackets(template, state);
    },
});

// Bracket substitution helper
function substituteBrackets(template: string, state: TestSessionState): string {
    const weakTopics = Array.from(state.topicScores.entries())
        .filter(([_, score]) => score.correct / score.total < 0.6)
        .map(([_, score]) => score.objectiveTitle)
        .join(", ");

    const strongTopics = Array.from(state.topicScores.entries())
        .filter(([_, score]) => score.correct / score.total >= 0.8)
        .map(([_, score]) => score.objectiveTitle)
        .join(", ");

    const currentTopic = state.answers.length > 0 ? state.topicScores.get(state.answers[state.answers.length - 1].questionId)?.objectiveTitle : "";

    const topicPerformance = currentTopic
        ? (() => {
              const score = state.topicScores.get(currentTopic);
              return score ? `${score.correct}/${score.total} correct` : "";
          })()
        : "";

    const replacements: Record<string, string> = {
        "[CURRENT_SCORE]": `${state.correctCount}/${state.answers.length}`,
        "[CORRECT_COUNT]": state.correctCount.toString(),
        "[INCORRECT_COUNT]": state.incorrectCount.toString(),
        "[CURRENT_STREAK]": state.currentStreak.toString(),
        "[PROGRESS]": `Question ${state.currentQuestionIndex}/${state.totalQuestions}`,
        "[TIME_ELAPSED]": `${Math.floor(state.totalTimeSpent / 60)} minutes`,
        "[LAST_ANSWER]": state.answers.length > 0 ? (state.answers[state.answers.length - 1].isCorrect ? "correct" : "incorrect") : "",
        "[WEAK_TOPICS]": weakTopics || "None yet",
        "[STRONG_TOPICS]": strongTopics || "Building...",
        "[HINTS_USED]": state.totalHintsUsed.toString(),
        "[CURRENT_TOPIC]": currentTopic,
        "[TOPIC_PERFORMANCE]": topicPerformance,
    };

    let result = template;
    for (const [bracket, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(bracket.replace(/[[\]]/g, "\\$&"), "g"), value);
    }

    return result;
}
```

---

## 🔧 Implementation Plan

### Phase 1: Extend Test Setup Agent (Current → Enhanced)

**Current State**: Basic flashcard generation with ADK
**Goal**: Add HITL workflow and advanced configuration

#### Steps:

1. **Create PdfSession Model**
    - Add to Prisma schema
    - Run migration
    - Update PrismaService

2. **Build Plan Proposal System**
    - Create `analyze_pdf_content` tool
    - Create `propose_test_plan` tool
    - Update ROOT_AGENT_INSTRUCTION for HITL

3. **Implement Picture Card Generation**
    - Integrate with your image generation service
    - Create `generate_picture_card` tool
    - Update Mcq model for pictures

4. **Create Session Management**
    - New endpoints for session CRUD
    - Plan approval/rejection flow
    - Iteration tracking

5. **Update Frontend**
    - PDF upload with preferences form
    - Plan review interface
    - Approval/feedback UI

### Phase 2: Build Test Taking Agent (New)

**Goal**: Complete test delivery and analysis system

#### Steps:

1. **Create Test Taking Service**
    - New NestJS module: `test-taking`
    - Implement Test Taking Agent with ADK
    - Define agent instructions and tools

2. **Build Question Delivery System**
    - Sequential question presentation
    - Progress tracking
    - Hint system

3. **Implement Answer Collection**
    - Real-time answer saving
    - Time tracking per question
    - Session state management

4. **Create Analysis Engine**
    - Performance calculation
    - Topic-level breakdown
    - Pattern recognition for mistakes

5. **Build Feedback Generator**
    - AI-powered feedback using Gemini
    - Personalized recommendations
    - Motivational messaging

6. **Update Frontend**
    - Test taking interface
    - Progress indicators
    - Results dashboard
    - Detailed feedback view

### Phase 3: Integration & Polish

1. **Connect Both Agents**
    - Seamless flow from setup → taking
    - Session continuity
    - State management

2. **Add Analytics**
    - User progress over time
    - Topic mastery tracking
    - Spaced repetition suggestions

3. **Optimize Performance**
    - Caching strategies
    - Lazy loading
    - Background processing

---

## 🎨 User Experience Flow

### Complete Journey

```
┌──────────────────────────────────────────────────────────────┐
│                     User Journey                             │
└──────────────────────────────────────────────────────────────┘

1. User uploads PDF
   ↓
2. User enters preferences (free-form text):
   "I want 20 medium difficulty questions focusing on chapters 2-4,
    with some picture cards mixed in. I have 30 minutes to study."
   ↓
3. Agent analyzes PDF and creates plan:
   "I'll create 20 questions across 4 objectives:
    - Cell Structure (5 questions, 2 with pictures)
    - Photosynthesis (6 questions, 1 with picture)
    - Respiration (5 questions)
    - Genetics (4 questions, 1 with picture)

    Estimated time: 25-30 minutes
    Difficulty: Medium

    Does this look good?"
   ↓
4. User reviews and approves (or requests changes)
   ↓
5. Agent generates flashcards (with progress updates)
   ↓
6. User starts test
   ↓
7. Agent presents questions one by one
   - Shows encouraging prompts
   - Offers hints when requested
   - Displays picture cards
   ↓
8. User completes test
   ↓
9. Agent analyzes performance:
   - "You scored 16/20 (80%)!"
   - "Strong areas: Cell Structure, Photosynthesis"
   - "Needs work: Genetics (50% correct)"
   - "You spent most time on Respiration questions"
   ↓
10. Agent provides detailed feedback:
    - Explanation for each wrong answer
    - Why you might have chosen the wrong answer
    - Specific recommendations
    - Next steps for improvement
```

---

## 🚀 Technical Architecture

### Agent Communication

```typescript
// Test Setup Agent
const setupAgent = new LlmAgent({
    name: "test_setup_orchestrator",
    model: "gemini-2.5-flash",
    instruction: TEST_SETUP_INSTRUCTION,
    tools: [analyzePdfContent, proposeTestPlan, generatePictureCard, saveObjective, completeSetup],
});

// Test Taking Agent
const takingAgent = new LlmAgent({
    name: "test_taking_orchestrator",
    model: "gemini-2.5-flash",
    instruction: TEST_TAKING_INSTRUCTION,
    tools: [loadTestQuestions, recordAnswer, provideHint, analyzePerformance, generateFeedback],
});
```

### API Endpoints

```typescript
// Test Setup
POST   /api/pdf-sessions              // Create new session
POST   /api/pdf-sessions/:id/analyze  // Analyze PDF + preferences
GET    /api/pdf-sessions/:id/plan     // Get proposed plan
POST   /api/pdf-sessions/:id/approve  // Approve plan
POST   /api/pdf-sessions/:id/feedback // Provide feedback on plan
POST   /api/pdf-sessions/:id/generate // Start generation

// Test Taking
POST   /api/test-attempts              // Start new test attempt
GET    /api/test-attempts/:id          // Get test state
POST   /api/test-attempts/:id/answer   // Submit answer
GET    /api/test-attempts/:id/hint     // Get hint for current question
POST   /api/test-attempts/:id/complete // Finish test
GET    /api/test-attempts/:id/results  // Get results + feedback
```

---

## 📊 Success Metrics

### Test Setup Agent

- Plan approval rate (first iteration)
- Average iterations to approval
- User satisfaction with generated questions
- Picture card quality ratings

### Test Taking Agent

- Test completion rate
- Average time per question
- Hint usage patterns
- Feedback helpfulness ratings
- User improvement over multiple attempts

---

## 🔮 Future Enhancements

1. **Adaptive Difficulty**: Adjust question difficulty based on performance
2. **Spaced Repetition**: Schedule review sessions
3. **Collaborative Learning**: Share flashcard sets
4. **Voice Mode**: Audio questions and answers
5. **Mobile App**: Native iOS/Android experience
6. **Gamification**: Points, badges, leaderboards
7. **Study Groups**: Multi-user test sessions
8. **Export Options**: PDF, Anki, Quizlet formats
