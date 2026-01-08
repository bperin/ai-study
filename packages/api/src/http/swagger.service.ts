import { Injectable, INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SwaggerService {
  setup(app: INestApplication) {
    const config = new DocumentBuilder().setTitle('Dash AI API').setDescription('The Dash AI API description').setVersion('1.0').addBearerAuth().build();

    const document = SwaggerModule.createDocument(app, config);

    // Write OpenAPI spec to file
    try {
      const outputPath = path.resolve(process.cwd(), 'openapi.json');
      fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
      console.log(`✅ OpenAPI spec written to ${outputPath}`);
    } catch (error) {
      console.error('❌ Failed to write OpenAPI spec:', error);
    }

    SwaggerModule.setup('api', app, document);
  }
}
