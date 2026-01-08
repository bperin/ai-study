import { registerAs } from '@nestjs/config';

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV,
  database: {
    url: process.env.DATABASE_URL,
  },
  frontend: {
    url: process.env.FRONTEND_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    cloud: {
      bucketName: process.env.GCP_BUCKET_NAME,
      saKey: process.env.GCP_SA_KEY,
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
});
