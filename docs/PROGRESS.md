# Project Progress & Roadmap

## ✅ Completed

### 1. Infrastructure & Project Structure
- [x] **Monorepo Setup**: Initialized workspace with `packages/api` (Backend) and `packages/web` (Frontend).
- [x] **Global Configuration**: Configured root `package.json`, `tsconfig.json`, and `jest.config.js` for monorepo management.

### 2. Backend (@memorang/api)
- [x] **Framework**: Initialized **NestJS** application.
- [x] **Database ORM**: Configured **Prisma 7.x** with PostgreSQL support.
- [x] **Schema Design**: Defined initial data models:
    - `User`: Identity management.
    - `Pdf`: Stores uploaded content metadata.
    - `Objective`: Learning goals derived from PDFs.
    - `Mcq`: Generated questions linked to objectives.
- [x] **Dependencies**: Installed `@google/generative-ai` (Gemini), `pdf-parse`, and core NestJS modules.

### 3. Frontend (@memorang/web)
- [x] **Framework**: Re-initialized with **Next.js 14** (React 18).
- [x] **Styling**: Configured **Tailwind CSS** and `globals.css`.
- [x] **UI Libraries**: Installed `@copilotkit/react-core` and `@copilotkit/react-ui`.
- [x] **Initial Pages**: Created basic `layout.tsx` and `page.tsx` scaffold.

---

## 🚧 What Needs to be Done (Roadmap)

### 1. Backend Development (@memorang/api)
- [ ] **PDF Processing**:
    - Implement file upload endpoint (multipart/form-data).
    - Create service to parse PDF text using `pdf-parse`.
    - Implement chunking strategy for large documents.
- [ ] **AI Integration (Google Gemini)**:
    - Implement "Lesson Planner" agent to extract objectives from text.
    - Implement "Quiz Generator" agent to create MCQs from objectives.
    - Implement "Tutor" agent for hints and explanations.
- [ ] **Business Logic**:
    - Build Plan Approval service (HITL flow).
    - Implement Quiz Session tracking (scoring, progress).

### 2. Frontend Development (@memorang/web)
- [ ] **Upload Experience**:
    - Build file drag-and-drop component.
    - Handle upload progress and error states.
- [ ] **Plan Review UI**:
    - Create interface for users to review/edit generated lesson plans before starting.
- [ ] **Interactive Study Widget**:
    - Integrate `CopilotKit` sidebar/widget.
    - Render MCQs with selection logic.
    - Display real-time feedback (Success/Failure states).
- [ ] **Results Dashboard**:
    - Show session summary and study tips.

### 3. Infrastructure & storage
- [ ] **File Storage**: Connect to Supabase Storage or AWS S3 for persisting raw PDFs.
- [ ] **Authentication**: Implement Auth guards (likely Supabase Auth or mock for MVP).
- [ ] **Production DB**: Transition from local PostgreSQL to AWS Aurora.