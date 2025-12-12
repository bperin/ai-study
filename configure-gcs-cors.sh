#!/bin/bash

# Define the CORS configuration with wildcard origin
cat <<EOF > gcs-cors.json
[
    {
      "origin": ["*"],
      "method": ["GET", "POST", "PUT", "OPTIONS"],
      "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
      "maxAgeSeconds": 3600
    }
]
EOF

# Apply the CORS configuration to the bucket
# Note: This assumes gcloud is installed and authenticated, or informs the user to run it
echo "To apply CORS configuration to your GCS bucket, run the following command:"
echo "gcloud storage buckets update gs://ai-study-pdfs-1765508603 --cors-file=gcs-cors.json"