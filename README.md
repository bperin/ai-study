# ai-study
AI based study guide that injests a PDF turns them into flash cards

## Uploading PDFs

The API can generate a short-lived, signed URL that lets the frontend upload PDFs directly to Google Cloud Storage. Configure the backend with the following environment variables:

- `GCP_BUCKET_NAME`: Target bucket for uploads.
- `GCP_PROJECT_ID`: Google Cloud project id.
- `GCP_CLIENT_EMAIL`: Service account client email (optional if using default credentials).
- `GCP_PRIVATE_KEY`: Service account private key (use `\n` for newlines), or
- `GCP_PRIVATE_KEY_BASE64`: Base64-encoded private key string.

By default the frontend points to `http://localhost:3000` for the API. Set `NEXT_PUBLIC_API_URL` if the API is hosted elsewhere.
