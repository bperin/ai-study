import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as fs from "fs";
import { ValidationPipe } from "@nestjs/common";
import { json, urlencoded } from "express";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Increase timeout for long-running AI operations (10 minutes)
    app.use((req, res, next) => {
        req.setTimeout(600000); // 10 minutes
        res.setTimeout(600000); // 10 minutes
        next();
    });

    app.use(json({ limit: "50mb" }));
    app.use(urlencoded({ extended: true, limit: "50mb" }));
    app.enableCors({
        origin: process.env.FRONTEND_URL || "http://localhost:3001",
        credentials: true,
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    const config = new DocumentBuilder().setTitle("AI Study API").setDescription("The AI Study API description").setVersion("1.0").addBearerAuth().build();
    const document = SwaggerModule.createDocument(app, config);

    fs.writeFileSync("./openapi.json", JSON.stringify(document));
    SwaggerModule.setup("api", app, document);

    await app.listen(3000);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
