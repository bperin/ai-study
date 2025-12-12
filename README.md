# AI Study

AI-based study guide that ingests PDFs and turns them into interactive flashcards.

## 🎯 Overview

AI Study is a full-stack application that helps students learn more effectively by:

1. Uploading study materials (PDFs)
2. Automatically extracting and analyzing content
3. Generating intelligent flashcards and multiple-choice questions
4. Providing an interactive study and testing interface

## ✨ Current Features

### ✅ Completed

- **User Authentication**: JWT-based login and registration
- **Secure PDF Upload**: Direct-to-cloud upload via Google Cloud Storage
    - User-isolated file storage
    - 10MB file size limit
    - PDF-only validation
    - Time-limited signed URLs
- **Database**: Prisma 7 with PostgreSQL (Neon)
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

### 🚧 In Progress

- PDF text extraction
- AI-powered flashcard generation (using Google Gemini)
- Frontend study interface

## 🛠 Tech Stack

### Backend (`packages/api`)

- **Framework**: NestJS
- **Database**: Prisma 7 + PostgreSQL (Neon)
- **Authentication**: JWT with Passport
- **Storage**: Google Cloud Storage
- **AI**: Google Generative AI (Gemini)

### Frontend (`packages/web`)

- **Framework**: Next.js
- **Language**: TypeScript
- **API Client**: Auto-generated from OpenAPI spec

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start both backend and frontend
./run.sh
```

The services will start on:

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **API Docs**: http://localhost:3000/api

### Testing PDF Upload

```bash
# Run end-to-end upload test
./test-upload.sh
```

## 📁 Project Structure

```
ai-study/
├── packages/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/     # Authentication module
│   │   │   ├── users/    # User management
│   │   │   ├── uploads/  # PDF upload handling
│   │   │   ├── tests/    # Test/quiz module
│   │   │   └── prisma/   # Database service
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/              # Next.js frontend
├── docs/
│   ├── TECHNICAL_PROGRESS.md  # Detailed technical docs
│   └── PDF_UPLOAD_SETUP.md    # GCS setup guide
├── run.sh                # Start all services
└── test-upload.sh        # Test upload flow
```

## 🔧 Environment Setup

Copy `.env.example` to `.env` in `packages/api/`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret-key"

# Google Cloud Storage
GCP_PROJECT_ID="your-project-id"
GCP_BUCKET_NAME="your-bucket-name"
GCP_CLIENT_EMAIL="your-service-account@..."
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

See `docs/PDF_UPLOAD_SETUP.md` for detailed GCP setup instructions.

## 📚 Documentation

- **[Technical Progress](docs/TECHNICAL_PROGRESS.md)**: Detailed implementation status
- **[PDF Upload Setup](docs/PDF_UPLOAD_SETUP.md)**: Google Cloud Storage configuration
- **API Docs**: Available at http://localhost:3000/api when running

## 🧪 Development

### Backend Development

```bash
cd packages/api

# Start in watch mode
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client
npx prisma generate

# Push schema changes
npx prisma db push
```

### Frontend Development

```bash
cd packages/web

# Start dev server
npm run dev

# Regenerate API client (after backend changes)
npm run codegen
```

## 🎯 Roadmap

- [x] User authentication
- [x] Secure PDF upload to cloud storage
- [ ] PDF text extraction
- [ ] AI-powered flashcard generation
- [ ] Interactive study interface
- [ ] Spaced repetition algorithm
- [ ] Progress tracking and analytics
- [ ] Mobile app (React Native)

## 📝 License

MIT

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## Uploading PDFs

The API can generate a short-lived, signed URL that lets the frontend upload PDFs directly to Google Cloud Storage. Configure the backend with the following environment variables:

- `GCP_PROJECT_ID`: Google Cloud project id.
- `GCP_CLIENT_EMAIL`: Service account client email (optional if using default credentials).
- `GCP_PRIVATE_KEY`: Service account private key (use `\n` for newlines), or
- `GCP_PRIVATE_KEY_BASE64`: Base64-encoded private key string.

By default the frontend points to `http://localhost:3000` for the API. Set `NEXT_PUBLIC_API_URL` if the API is hosted elsewhere.
