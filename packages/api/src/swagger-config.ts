import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const createSwaggerConfig = () => {
  return new DocumentBuilder()
    .setTitle('Dash AI API')
    .setDescription('The Dash AI API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
};

export const createSwaggerDocument = (app: INestApplication) => {
  const config = createSwaggerConfig();
  return SwaggerModule.createDocument(app, config);
};