# Google Cloud Storage Setup for PDF Uploads

## Overview
The backend provides a secure signed URL endpoint for uploading PDFs to Google Cloud Storage. This implementation includes:

- **JWT Authentication**: Only authenticated users can request upload URLs
- **User Isolation**: Files are organized by user ID (`uploads/{userId}/{uuid}-{filename}`)
- **Content Type Validation**: Only PDF files are accepted
- **File Size Limits**: Maximum 10MB per file
- **Time-Limited URLs**: Signed URLs expire after 10 minutes
- **Filename Sanitization**: Special characters are removed from filenames

## Environment Variables

Add these to your `packages/api/.env` file:

```bash
# Google Cloud Storage Configuration
GCP_PROJECT_ID=your-project-id
GCP_BUCKET_NAME=your-bucket-name
GCP_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Option 1: Use raw private key (with escaped newlines)
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"

# Option 2: Use base64-encoded private key (alternative to above)
# GCP_PRIVATE_KEY_BASE64=base64_encoded_key_here
```

## Setting Up Google Cloud Storage

### 1. Create a GCS Bucket

```bash
# Using gcloud CLI
gcloud storage buckets create gs://your-bucket-name \
  --location=us-central1 \
  --uniform-bucket-level-access
```

### 2. Create a Service Account

```bash
# Create service account
gcloud iam service-accounts create ai-study-uploader \
  --display-name="AI Study PDF Uploader"

# Grant Storage Object Admin role
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:ai-study-uploader@your-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Create and download key
gcloud iam service-accounts keys create ~/ai-study-key.json \
  --iam-account=ai-study-uploader@your-project-id.iam.gserviceaccount.com
```

### 3. Extract Credentials from JSON Key

From the downloaded `ai-study-key.json`:
- Copy `project_id` → `GCP_PROJECT_ID`
- Copy `client_email` → `GCP_CLIENT_EMAIL`
- Copy `private_key` → `GCP_PRIVATE_KEY`

## API Usage

### Endpoint
```
POST /uploads/sign
```

### Authentication
Requires JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Request Body
```json
{
  "fileName": "my-study-guide.pdf",
  "contentType": "application/pdf"
}
```

### Response
```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "filePath": "uploads/user-123/uuid-my-study-guide.pdf",
  "expiresAt": "2025-12-11T19:05:00.000Z",
  "maxSizeBytes": 10485760
}
```

### Frontend Example

```typescript
// 1. Get signed URL from backend
async function getUploadUrl(file: File, token: string) {
  const response = await fetch('http://localhost:3000/uploads/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });
  
  return response.json();
}

// 2. Upload file directly to GCS
async function uploadToGCS(file: File, uploadUrl: string) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/pdf',
    },
    body: file,
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return response;
}

// 3. Complete flow
async function handlePdfUpload(file: File, jwtToken: string) {
  // Validate file
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }
  
  if (file.size > 10485760) {
    throw new Error('File size must be less than 10MB');
  }
  
  // Get signed URL
  const { uploadUrl, filePath } = await getUploadUrl(file, jwtToken);
  
  // Upload to GCS
  await uploadToGCS(file, uploadUrl);
  
  // Now you can save filePath to your database
  console.log('File uploaded successfully:', filePath);
  
  return filePath;
}
```

## Security Features

1. **Authentication Required**: Users must be logged in to get upload URLs
2. **User Isolation**: Each user's files are stored in separate directories
3. **Content Type Validation**: Only PDFs are accepted
4. **File Size Limits**: 10MB maximum enforced at the GCS level
5. **Filename Sanitization**: Prevents directory traversal and special character issues
6. **Time-Limited URLs**: Signed URLs expire after 10 minutes
7. **Direct Upload**: Files go directly to GCS, not through your server

## Testing

```bash
# 1. Login to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Get signed upload URL
curl -X POST http://localhost:3000/uploads/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"fileName":"test.pdf","contentType":"application/pdf"}'

# 3. Upload file to signed URL
curl -X PUT "SIGNED_URL_FROM_STEP_2" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf
```

## Next Steps

After implementing the upload, you'll want to:

1. **Store file metadata in database**: Save `filePath` to the `Pdf` model
2. **Process PDFs**: Extract text and generate flashcards
3. **Add download URLs**: Create signed URLs for reading files
4. **Implement cleanup**: Delete files when users delete PDFs
5. **Add progress tracking**: Show upload progress in the frontend
