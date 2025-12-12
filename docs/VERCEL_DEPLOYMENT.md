# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```

## Environment Variables

### Backend (API)
Set these in Vercel dashboard for the API project:

```env
DATABASE_URL=your_neon_postgres_url
GOOGLE_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_key
GCS_BUCKET_NAME=your_gcs_bucket
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### Frontend (Web)
Set these in Vercel dashboard for the Web project:

```env
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
NEXT_PUBLIC_GOOGLE_API_KEY=your_gemini_api_key
```

## Deployment Steps

### 1. Deploy Backend (API)

```bash
cd packages/api
vercel
```

Follow prompts:
- **Set up and deploy**: Yes
- **Which scope**: Your account
- **Link to existing project**: No
- **Project name**: ai-study-api
- **Directory**: ./
- **Override settings**: No

After deployment, note the URL (e.g., `https://ai-study-api.vercel.app`)

### 2. Deploy Frontend (Web)

```bash
cd packages/web
vercel
```

Follow prompts:
- **Set up and deploy**: Yes
- **Which scope**: Your account  
- **Link to existing project**: No
- **Project name**: ai-study-web
- **Directory**: ./
- **Override settings**: No

### 3. Configure Environment Variables

#### For API:
```bash
cd packages/api
vercel env add DATABASE_URL
vercel env add GOOGLE_API_KEY
vercel env add JWT_SECRET
vercel env add GCS_BUCKET_NAME
vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON
```

#### For Web:
```bash
cd packages/web
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_GOOGLE_API_KEY
```

### 4. Redeploy with Environment Variables

```bash
# API
cd packages/api
vercel --prod

# Web
cd packages/web  
vercel --prod
```

## Database Setup

### Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Vercel as `DATABASE_URL`

### Run Migrations

```bash
cd packages/api
DATABASE_URL="your_neon_url" npx prisma db push
```

## Post-Deployment

### Update Frontend API URL

1. Go to Vercel dashboard → Web project → Settings → Environment Variables
2. Set `NEXT_PUBLIC_API_URL` to your API URL
3. Redeploy frontend

### Update CORS

The API needs to allow your frontend domain. Update `main.ts`:

```typescript
app.enableCors({
    origin: [
        'http://localhost:3001',
        'https://your-frontend.vercel.app'
    ],
    credentials: true,
});
```

Then redeploy API.

## Vercel Dashboard

### API Project Settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Web Project Settings  
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

## Troubleshooting

### API Not Starting
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Check `vercel.json` configuration

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Neon project is running
- Run `prisma db push` to sync schema

### CORS Errors
- Add frontend URL to CORS whitelist in `main.ts`
- Redeploy API after changes

### Environment Variables Not Loading
- Ensure variables are set for "Production" environment
- Redeploy after adding variables
- Check variable names match exactly

## Continuous Deployment

Vercel automatically deploys on git push:

1. **Connect GitHub**:
   - Go to Vercel dashboard
   - Import Git Repository
   - Select your repo
   - Configure build settings

2. **Automatic Deploys**:
   - Push to `main` → Production deploy
   - Push to other branches → Preview deploy

## Custom Domains

### Add Custom Domain

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

### SSL Certificate
- Automatically provisioned by Vercel
- Usually ready in 5-10 minutes

## Monitoring

### View Logs
```bash
vercel logs <deployment-url>
```

### Analytics
- Go to Project → Analytics
- View performance metrics
- Monitor errors

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] CORS configured for production domain
- [ ] API URL updated in frontend
- [ ] Custom domains configured (optional)
- [ ] SSL certificates active
- [ ] Error monitoring enabled
- [ ] Performance metrics reviewed

---

**Quick Deploy Commands:**

```bash
# Deploy everything
cd packages/api && vercel --prod
cd ../web && vercel --prod

# View deployments
vercel ls

# View logs
vercel logs
```

**Status**: Ready to Deploy! 🚀
