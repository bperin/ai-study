import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import { createSwaggerDocument } from '../src/swagger-config';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });
  
  const document = createSwaggerDocument(app);
  
  fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
  console.log('openapi.json generated successfully');
  
  await app.close();
  process.exit(0);
}

generateOpenApi();