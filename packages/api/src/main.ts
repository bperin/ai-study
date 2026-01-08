import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
  console.log('🚀 Starting bootstrap process...');
  const app = await NestFactory.create(AppModule);
  console.log('✅ Nest application instance created.');

  const port = process.env.PORT || 3000;
  console.log(`📡 Attempting to listen on port ${port}...`);
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Application successfully started and listening on 0.0.0.0:${port}`);
}
bootstrap().catch(err => {
  console.error('❌ FATAL ERROR DURING BOOTSTRAP:', err);
  process.exit(1);
});
