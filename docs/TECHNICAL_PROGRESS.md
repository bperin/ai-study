# AI Study - Technical Progress

**Last Updated**: December 11, 2025

## ✅ Completed Features

### 1. Database Setup (Prisma 7)

**Status**: ✅ Complete and Tested

**Implementation Details**:

- **ORM**: Prisma 7 with PostgreSQL adapter
- **Database Provider**: Neon (Prisma-hosted PostgreSQL)
- **Driver**: `@prisma/adapter-pg` with `pg` connection pool
- **Configuration**: `prisma.config.ts` for CLI, adapter in `PrismaService`

**Database Schema**:

```prisma
- User (id, email, password, createdAt, updatedAt)
- Pdf (id, filename, content, userId, createdAt)
- Objective (id, title, difficulty, pdfId)
- Mcq (id, question, options[], correctIdx, explanation, hint, externalLink, objectiveId)
- TestAttempt (id, userId, pdfId, score, total, startedAt, completedAt)
- UserAnswer (id, attemptId, mcqId, selectedIdx, isCorrect, createdAt)
```

**Key Changes for Prisma 7**:

- Removed `url` from `schema.prisma` datasource
- Added constructor with `PrismaPg` adapter in `PrismaService`
- Database URL now passed via adapter, not schema file

**Files Modified**:

- `packages/api/src/prisma/prisma.service.ts`
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma.config.ts`

---

### 2. Authentication System

**Status**: ✅ Complete

**Implementation Details**:

- **Strategy**: JWT (JSON Web Tokens)
- **Library**: `@nestjs/jwt`, `@nestjs/passport`
- **Password Hashing**: bcrypt
- **Token Expiration**: 1 hour

**Endpoints**:

- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns JWT)
- `GET /users/me` - Get current user (requires JWT)

**Security Features**:

- Passwords hashed with bcrypt
- JWT tokens signed with secret key
- Protected routes use `JwtAuthGuard`

**Files**:

- `packages/api/src/auth/` (auth module)
- `packages/api/src/users/` (users module)

---

### 3. Secure PDF Upload to Google Cloud Storage

**Status**: ✅ Complete and Tested

**Implementation Details**:

- **Cloud Provider**: Google Cloud Storage
- **Project**: `pro-pulsar-274402`
- **Bucket**: `ai-study-pdfs-1765508603`
- **Service Account**: `ai-study-uploader@pro-pulsar-274402.iam.gserviceaccount.com`
- **Upload Method**: Signed URLs (direct client-to-GCS upload)

**Security Features**:

1. **JWT Authentication Required**: Only logged-in users can request upload URLs
2. **User Isolation**: Files stored in `uploads/{userId}/{uuid}-{filename}`
3. **Content Type Validation**: Only `application/pdf` accepted
4. **File Size Limit**: 10MB maximum (enforced client-side)
5. **Time-Limited URLs**: Signed URLs expire after 10 minutes
6. **Filename Sanitization**: Special characters removed to prevent attacks
7. **Direct Upload**: Files bypass server, go straight to GCS

**API Endpoint**:

```
POST /uploads/sign
Authorization: Bearer {jwt-token}
Content-Type: application/json

Request Body:
{
  "fileName": "my-study-guide.pdf",
  "contentType": "application/pdf"
}

Response:
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "filePath": "uploads/{userId}/{uuid}-{filename}",
  "expiresAt": "2025-12-12T03:22:51.773Z",
  "maxSizeBytes": 10485760
}
```

**Upload Flow**:

1. User logs in → receives JWT token
2. Frontend requests signed URL from `/uploads/sign`
3. Frontend uploads PDF directly to GCS using signed URL
4. Backend saves `filePath` to database for later retrieval

**GCP Configuration**:

- **Bucket Location**: `us-central1`
- **Access Control**: Uniform bucket-level access
- **IAM Role**: Service account has `roles/storage.objectAdmin`
- **Authentication**: Service account JSON key credentials

**Environment Variables**:

```bash
GCP_PROJECT_ID=pro-pulsar-274402
GCP_BUCKET_NAME=ai-study-pdfs-1765508603
GCP_CLIENT_EMAIL=ai-study-uploader@pro-pulsar-274402.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Files Modified/Created**:

- `packages/api/src/uploads/uploads.service.ts` - Core upload logic
- `packages/api/src/uploads/uploads.controller.ts` - API endpoint with auth
- `packages/api/src/uploads/uploads.module.ts` - Module definition
- `packages/api/src/app.module.ts` - Registered UploadsModule
- `packages/api/.env` - Added GCP credentials
- `docs/PDF_UPLOAD_SETUP.md` - Complete setup documentation
- `test-upload.sh` - End-to-end test script

**Testing**:

- ✅ User registration works
- ✅ User login returns valid JWT
- ✅ Signed URL generation requires authentication
- ✅ PDF upload to GCS succeeds
- ✅ Files stored with correct user isolation path

---

## 🚧 In Progress / Next Steps

### 4. PDF Processing & Text Extraction

**Status**: 🔜 Not Started

**Planned Implementation**:

- Use `pdf-parse` library (already installed)
- Extract text content from uploaded PDFs
- Store extracted text in `Pdf.content` field
- Trigger processing after successful upload

**Technical Approach**:

```typescript
// After upload, download from GCS and process
const file = storage.bucket(bucketName).file(filePath);
const [buffer] = await file.download();
const pdfData = await pdfParse(buffer);
const extractedText = pdfData.text;

// Save to database
await prisma.pdf.create({
    data: {
        filename,
        content: extractedText,
        userId,
    },
});
```

---

### 5. AI-Powered Flashcard Generation

**Status**: 🔜 Not Started

**Planned Implementation**:

- Use Google Generative AI (Gemini)
- Library: `@google/generative-ai` (already installed)
- Generate learning objectives from PDF content
- Create multiple-choice questions with explanations

**Technical Approach**:

```typescript
// Use Gemini to analyze PDF content
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const prompt = `
Analyze this study material and create:
1. 3-5 learning objectives
2. For each objective, create 3-5 multiple choice questions
3. Include explanations and hints

Content: ${pdfContent}
`;

const result = await model.generateContent(prompt);
// Parse and store in database
```

---

### 6. Frontend Implementation

**Status**: 🔜 Not Started

**Planned Features**:

- PDF upload interface with drag-and-drop
- Progress indicator for uploads
- Study session interface
- Flashcard review system
- Test taking and scoring

**Tech Stack**:

- Next.js (already set up in `packages/web`)
- TypeScript
- Generated API client (OpenAPI)

---

## 📊 System Architecture

### Current Stack

```
Frontend (Port 3001)
├── Next.js
├── TypeScript
└── Generated API Client

Backend (Port 3000)
├── NestJS
├── Prisma 7 (PostgreSQL)
├── JWT Authentication
├── Google Cloud Storage
└── Google Generative AI (Gemini)

Database
└── Neon PostgreSQL (Prisma-hosted)

Cloud Storage
└── Google Cloud Storage
    └── Bucket: ai-study-pdfs-1765508603
```

### Data Flow

```
1. User uploads PDF
   Frontend → Backend (/uploads/sign) → Returns signed URL
   Frontend → GCS (direct upload) → File stored

2. PDF processing (planned)
   Backend → Download from GCS → Extract text → Store in DB

3. Flashcard generation (planned)
   Backend → Send text to Gemini → Parse response → Store MCQs

4. Study session (planned)
   Frontend → Fetch flashcards → Display → Track answers → Submit results
```

---

## 🔧 Development Commands

### Start Services

```bash
./run.sh  # Starts both backend and frontend
```

### Backend Only

```bash
cd packages/api
npm run dev
```

### Database Operations

```bash
cd packages/api
npx prisma generate  # Generate Prisma Client
npx prisma db push   # Push schema changes
npx prisma studio    # Open database GUI
```

### Test Upload System

```bash
./test-upload.sh  # End-to-end upload test
```

---

## 📝 Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://..."
SHADOW_DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret-key"

# Google Cloud Storage
GCP_PROJECT_ID="pro-pulsar-274402"
GCP_BUCKET_NAME="ai-study-pdfs-1765508603"
GCP_CLIENT_EMAIL="ai-study-uploader@..."
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Google AI (for flashcard generation - to be added)
GOOGLE_AI_API_KEY="your-gemini-api-key"
```

---

## 🐛 Known Issues & Solutions

### Issue: Prisma 7 Compatibility

**Problem**: `PrismaClient needs to be constructed with non-empty, valid PrismaClientOptions`

**Solution**: ✅ Fixed

- Added `@prisma/adapter-pg` and `pg` packages
- Updated `PrismaService` constructor to use adapter
- Removed `url` from `schema.prisma` datasource

### Issue: GCS Upload Headers

**Problem**: `MalformedSecurityHeader` when using `extensionHeaders`

**Solution**: ✅ Fixed

- Removed `x-goog-content-length-range` from signed URL
- File size validation now enforced client-side
- Simpler signed URL without custom headers

---

## 📚 Documentation

- **Setup Guide**: `docs/PDF_UPLOAD_SETUP.md`
- **Environment Template**: `packages/api/.env.example`
- **Test Script**: `test-upload.sh`
- **This Document**: `docs/TECHNICAL_PROGRESS.md`

---

## 🎯 Immediate Next Steps

1. **PDF Processing**:
    - Create webhook/callback after upload
    - Download file from GCS
    - Extract text using `pdf-parse`
    - Store in database

2. **Flashcard Generation**:
    - Set up Gemini API key
    - Create prompt engineering for flashcard generation
    - Parse AI response into structured data
    - Store objectives and MCQs in database

3. **Frontend Integration**:
    - Build upload UI component
    - Add authentication flow
    - Create study session interface
    - Implement flashcard review system

---

## 🔐 Security Considerations

### Implemented

- ✅ JWT authentication for all protected endpoints
- ✅ Password hashing with bcrypt
- ✅ User isolation in file storage
- ✅ Content type validation (PDF only)
- ✅ Time-limited signed URLs
- ✅ Filename sanitization

### To Implement

- 🔜 Rate limiting on upload endpoint
- 🔜 File virus scanning
- 🔜 CORS configuration for production
- 🔜 HTTPS enforcement
- 🔜 Input validation on all endpoints
- 🔜 Audit logging for sensitive operations

---

## 📈 Performance Considerations

### Current Optimizations

- Direct client-to-GCS upload (no server bandwidth usage)
- Connection pooling for database (via pg adapter)
- JWT stateless authentication (no session storage)

### Future Optimizations

- 🔜 CDN for static assets
- 🔜 Database query optimization with indexes
- 🔜 Caching layer (Redis) for frequently accessed data
- 🔜 Background job processing for PDF analysis
- 🔜 Pagination for large datasets

---

**End of Technical Progress Document**
