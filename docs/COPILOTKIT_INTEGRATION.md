# CopilotKit Interactive Test Planning

**Date**: December 12, 2025, 1:41 AM PST  
**Status**: ✅ Complete

## Overview

Integrated CopilotKit for bidirectional AI chat that creates visual test plans with structured output rendered using shadcn components.

## User Experience Flow

### 1. User Opens Customize Page
- Sees PDF info and instructions
- AI chat sidebar is open by default

### 2. User Describes What They Want
**Example:**
```
User: "Create 20 questions about photosynthesis"
```

### 3. AI Creates Visual Test Plan
- AI calls `updateTestPlan` action with structured data
- Plan renders instantly with shadcn components
- Shows:
  - Total questions
  - Estimated time
  - Learning objectives with:
    - Title
    - Difficulty (color-coded: green/yellow/red)
    - Question count
    - Topics covered

### 4. User Refines Through Chat
**Example:**
```
User: "Make it 15 total, more focus on Calvin cycle"
```

AI updates the plan in real-time - the UI updates automatically!

### 5. User Approves
**Example:**
```
User: "Looks good, generate it!"
```

AI calls `generateFlashcards` action → Creates actual questions → Redirects to study page

## Technical Implementation

### CopilotKit Actions

#### 1. `updateTestPlan`
```typescript
{
  name: "updateTestPlan",
  description: "Update the test plan based on user's requirements",
  parameters: [
    { name: "objectives", type: "object[]" },
    { name: "summary", type: "string" },
    { name: "estimatedTime", type: "string" }
  ],
  handler: (data) => {
    // Updates React state
    // Renders visual plan with shadcn
  }
}
```

#### 2. `generateFlashcards`
```typescript
{
  name: "generateFlashcards",
  description: "Generate actual flashcards after approval",
  parameters: [
    { name: "finalPrompt", type: "string" }
  ],
  handler: async (data) => {
    // Calls backend API
    // Generates questions
    // Redirects to study page
  }
}
```

### Readable Context

AI has access to:
- **PDF Info**: Filename, ID, metadata
- **Current Test Plan**: Objectives, questions, difficulty

### Visual Components

Test plan renders with:
- **Stats Cards**: Total questions, estimated time
- **Objective Cards**: Color-coded by difficulty
  - 🟢 Easy: Green
  - 🟡 Medium: Yellow
  - 🔴 Hard: Red
- **Topics**: Chips showing specific topics
- **Approval Prompt**: Blue info box

## API Route

**File**: `/packages/web/src/app/api/copilotkit/route.ts`

```typescript
POST /api/copilotkit
- Connects to Gemini 2.0 Flash
- Handles CopilotKit runtime
- Streams responses
```

## Benefits

### ✅ Bidirectional Communication
- User can refine plan through conversation
- No need to restart if they want changes

### ✅ Visual Feedback
- See the plan as it's being created
- Structured, beautiful UI (not just text)

### ✅ Flexible
- Can ask questions
- Can request changes
- Can see what they'll get before generating

### ✅ Smart
- AI understands context
- Remembers previous conversation
- Makes intelligent suggestions

## Example Conversations

### Scenario 1: Basic Request
```
User: "Create 15 medium questions"

AI: [Creates plan]
    - 15 questions
    - All medium difficulty
    - Covers main topics

User: "Perfect, generate it!"

AI: [Generates flashcards]
```

### Scenario 2: Refinement
```
User: "Create 20 questions"

AI: [Creates plan with 20 questions]

User: "Actually make it 15, and add more hard questions"

AI: [Updates plan to 15 questions, more hard]

User: "Can you focus more on chapter 3?"

AI: [Updates plan to focus on chapter 3]

User: "Great, generate!"

AI: [Generates flashcards]
```

### Scenario 3: Questions
```
User: "I want questions about biology"

AI: "What specific topics in biology? Cells, genetics, ecology?"

User: "Genetics, specifically DNA replication"

AI: [Creates focused plan on DNA replication]

User: "How long will this take?"

AI: "About 25-30 minutes based on 18 questions"

User: "Perfect, let's do it"

AI: [Generates flashcards]
```

## Dependencies

```json
{
  "@copilotkit/react-core": "latest",
  "@copilotkit/react-ui": "latest",
  "@copilotkit/runtime": "latest"
}
```

## Environment Variables

```env
GOOGLE_API_KEY=your_gemini_api_key
# or
NEXT_PUBLIC_GOOGLE_API_KEY=your_gemini_api_key
```

## File Structure

```
packages/web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── copilotkit/
│   │   │       └── route.ts          # API endpoint
│   │   └── customize/
│   │       └── [id]/
│   │           └── page.tsx          # Main page with CopilotKit
│   └── components/
│       └── ui/
│           └── dialog.tsx            # shadcn Dialog (for fallback)
```

## Styling

- Uses existing shadcn components
- Color-coded difficulty levels
- Responsive grid layout
- Dark mode support
- Smooth animations

## Next Steps

- [ ] Add more example prompts
- [ ] Add difficulty distribution chart
- [ ] Add topic suggestions based on PDF content
- [ ] Add ability to save draft plans
- [ ] Add plan templates (quick start, comprehensive, etc.)
- [ ] Add estimated difficulty based on user history

---

**Status**: Production Ready  
**Last Updated**: December 12, 2025, 1:41 AM PST

## Quick Start

1. User opens `/customize/:pdfId`
2. Chat sidebar opens automatically
3. User describes what they want
4. AI creates visual plan
5. User refines or approves
6. Flashcards generate
7. Redirects to study page

**It's that simple!** 🎉
