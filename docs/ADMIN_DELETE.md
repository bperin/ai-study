# Admin Delete Functionality

**Date**: December 12, 2025, 1:33 AM PST  
**Status**: ✅ Complete (Backend)

## Overview

Added admin-only functionality to delete PDFs and all associated data from the system.

## Backend Implementation

### 1. Enhanced Admin Guard
- **File**: `/packages/api/src/auth/admin.guard.ts`
- **Checks**: Database for `isAdmin` flag instead of just JWT
- **Throws**: `ForbiddenException` if not admin

### 2. Delete Endpoint
- **Route**: `DELETE /pdfs/:id`
- **Guard**: `@UseGuards(AdminGuard)`
- **Access**: Admin only

### 3. Cascade Delete Logic

Deletes in correct order to respect foreign key constraints:

```typescript
1. UserAnswers (linked to test attempts)
2. TestAttempts (linked to PDF)
3. MCQs (linked to objectives)
4. Objectives (linked to PDF)
5. PdfSessions (linked to PDF)
6. PDF itself
```

### Response
```json
{
  "message": "PDF and all associated data deleted successfully",
  "pdfId": "uuid",
  "filename": "Study Guide.pdf"
}
```

## API Endpoints

### Check Admin Status
```
GET /users/me
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "isAdmin": true,  // <-- Check this
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Delete PDF (Admin Only)
```
DELETE /pdfs/:id
Authorization: Bearer <token>

Response:
{
  "message": "PDF and all associated data deleted successfully",
  "pdfId": "uuid",
  "filename": "Study Guide.pdf"
}
```

## Frontend Integration (TODO)

### Dashboard Updates Needed
1. Fetch user info to check `isAdmin`
2. Show delete button (trash icon) for admins
3. Confirm before delete
4. Call DELETE endpoint
5. Refresh PDF list

### Example Code
```tsx
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  // Check if user is admin
  fetch('/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(user => setIsAdmin(user.isAdmin));
}, []);

const handleDelete = async (pdfId: string) => {
  if (!confirm('Delete this PDF and all associated data?')) return;
  
  await fetch(`/pdfs/${pdfId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Refresh list
  fetchPdfs();
};
```

## Security

- ✅ Admin guard checks database, not just JWT claim
- ✅ Requires authentication (JwtAuthGuard)
- ✅ Requires admin status (AdminGuard)
- ✅ Cascade deletes prevent orphaned data
- ✅ Returns confirmation with deleted filename

## Database Schema

The `User` model already has `isAdmin` field:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  isAdmin   Boolean  @default(false)  // <-- Admin flag
  ...
}
```

## Making a User Admin

Use Prisma Studio or SQL:

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@example.com';
```

Or via Prisma Studio:
1. Open `npx prisma studio`
2. Navigate to User table
3. Find user
4. Set `isAdmin` to `true`
5. Save

## Testing

1. **Make yourself admin** in Prisma Studio
2. **Login** to get fresh JWT
3. **Check admin status**: `GET /users/me`
4. **Try delete**: `DELETE /pdfs/:id`
5. **Verify cascade**: Check that objectives, MCQs, attempts all deleted

## Error Handling

### Not Admin
```json
{
  "statusCode": 403,
  "message": "Admin access required",
  "error": "Forbidden"
}
```

### PDF Not Found
```json
{
  "statusCode": 404,
  "message": "PDF not found",
  "error": "Not Found"
}
```

## Next Steps

- [ ] Add delete button to frontend dashboard
- [ ] Add confirmation dialog
- [ ] Show success/error toast
- [ ] Refresh PDF list after delete
- [ ] Add admin badge in UI
- [ ] Add bulk delete functionality
- [ ] Add soft delete option (archive instead of delete)

---

**Status**: Backend Complete, Frontend Pending  
**Last Updated**: December 12, 2025, 1:33 AM PST
