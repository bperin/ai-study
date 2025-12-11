#!/bin/bash

# Test script for PDF upload functionality

echo "🧪 Testing AI Study PDF Upload System"
echo "======================================"
echo ""

# Step 1: Register a test user
echo "1️⃣  Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }')

echo "Register response: $REGISTER_RESPONSE"
echo ""

# Step 2: Login to get JWT token
echo "2️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }')

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$JWT_TOKEN" = "null" ] || [ -z "$JWT_TOKEN" ]; then
  echo "❌ Failed to get JWT token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got JWT token: ${JWT_TOKEN:0:20}..."
echo ""

# Step 3: Request signed upload URL
echo "3️⃣  Requesting signed upload URL..."
UPLOAD_URL_RESPONSE=$(curl -s -X POST http://localhost:3000/uploads/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "fileName": "test-study-guide.pdf",
    "contentType": "application/pdf"
  }')

echo "Upload URL response:"
echo "$UPLOAD_URL_RESPONSE" | jq '.'
echo ""

SIGNED_URL=$(echo $UPLOAD_URL_RESPONSE | jq -r '.uploadUrl')
FILE_PATH=$(echo $UPLOAD_URL_RESPONSE | jq -r '.filePath')

if [ "$SIGNED_URL" = "null" ] || [ -z "$SIGNED_URL" ]; then
  echo "❌ Failed to get signed URL"
  exit 1
fi

echo "✅ Got signed URL"
echo "📁 File will be stored at: $FILE_PATH"
echo ""

# Step 4: Create a dummy PDF for testing
echo "4️⃣  Creating test PDF..."
cat > /tmp/test.pdf << 'EOF'
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF
EOF

echo "✅ Created test PDF ($(wc -c < /tmp/test.pdf) bytes)"
echo ""

# Step 5: Upload to GCS
echo "5️⃣  Uploading to Google Cloud Storage..."
UPLOAD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$SIGNED_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @/tmp/test.pdf)

HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Upload successful!"
  echo ""
  echo "======================================"
  echo "🎉 All tests passed!"
  echo "======================================"
  echo ""
  echo "Your PDF upload system is working correctly!"
  echo "File uploaded to: $FILE_PATH"
else
  echo "❌ Upload failed with status: $HTTP_STATUS"
  echo "Response: $UPLOAD_RESPONSE"
  exit 1
fi

# Cleanup
rm /tmp/test.pdf

echo ""
echo "Next steps:"
echo "1. Integrate this into your frontend"
echo "2. Add PDF processing to extract text"
echo "3. Generate flashcards from the PDF content"
