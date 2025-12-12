import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as fs from "fs";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    const config = new DocumentBuilder().setTitle("Memorang AI Study API").setDescription("The Memorang AI Study API description").setVersion("1.0").addBearerAuth().build();
    const document = SwaggerModule.createDocument(app, config);

    fs.writeFileSync("./openapi.json", JSON.stringify(document));
    SwaggerModule.setup("api", app, document);

    await app.listen(3000);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
