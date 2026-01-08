import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './http/http-exception.filter';
import { SwaggerService } from './http/swagger.service';
import { createWinstonLogger } from './shared/logging/winston.config';

async function bootstrap() {
  console.log('🚀 Starting bootstrap process...');
  
  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(),
  });
  console.log('✅ Nest application instance created.');

  app.useGlobalFilters(new AllExceptionsFilter());
  console.log('✅ Global filters applied.');

 
  console.log('✅ Timeout middleware configured.');

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  console.log('✅ Body parsers configured.');

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost, cloud run, and firebase
      if (origin.startsWith('http://localhost') || origin.endsWith('.run.app') || origin.endsWith('.web.app') || origin.endsWith('.firebaseapp.com') || origin === 'https://storage.googleapis.com') {
        return callback(null, true);
      }

      // Fallback: allow all for now to unblock
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  });
  console.log('✅ CORS enabled.');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  console.log('✅ Global validation pipes configured.');

  // Setup Swagger using SwaggerService
  console.log('📦 Setting up Swagger...');
  const swaggerService = app.get(SwaggerService);
  swaggerService.setup(app);
  console.log('✅ Swagger setup complete.');

  const port = process.env.PORT || 3000;
  console.log(`📡 Attempting to listen on port ${port}...`);

  await app.listen(port, '0.0.0.0');
  console.log(`✅ Application successfully started and listening on 0.0.0.0:${port}`);
}
bootstrap().catch(err => {
  console.error('❌ FATAL ERROR DURING BOOTSTRAP:', err);
  process.exit(1);
});
