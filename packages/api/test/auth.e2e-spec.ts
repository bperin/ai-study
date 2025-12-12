import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("AuthController (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);

        // Clean up database
        await prisma.user.deleteMany({ where: { email: "test@example.com" } });
    });

    afterAll(async () => {
        // Clean up database
        await prisma.user.deleteMany({ where: { email: "test@example.com" } });
        await app.close();
    });

    it("/auth/register (POST)", async () => {
        const response = await request(app.getHttpServer())
            .post("/auth/register")
            .send({
                email: "test@example.com",
                password: "password123",
            })
            .expect(201);

        expect(response.body).toHaveProperty("access_token");
    });

    it("/auth/login (POST)", async () => {
        const response = await request(app.getHttpServer())
            .post("/auth/login")
            .send({
                email: "test@example.com",
                password: "password123",
            })
            .expect(200);

        expect(response.body).toHaveProperty("access_token");
    });

    it("/auth/login (POST) - invalid credentials", () => {
        return request(app.getHttpServer())
            .post("/auth/login")
            .send({
                email: "test@example.com",
                password: "wrongpassword",
            })
            .expect(401);
    });
});
