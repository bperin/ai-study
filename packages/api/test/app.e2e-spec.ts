import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./../src/app.module";

describe("API Health & Auth (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe("Health Checks", () => {
        it("should serve Swagger documentation", () => {
            return request(app.getHttpServer()).get("/api").expect(200);
        });
    });

    describe("Authentication", () => {
        it("should create a new user account", async () => {
            const email = `test${Date.now()}@example.com`;

            const response = await request(app.getHttpServer())
                .post("/auth/signup")
                .send({
                    email,
                    password: "TestPassword123!",
                })
                .expect(201);

            expect(response.body).toHaveProperty("access_token");
            expect(response.body.user.email).toBe(email);
        });

        it("should login with valid credentials", async () => {
            const email = `login${Date.now()}@example.com`;
            const password = "TestPassword123!";

            // Create user
            await request(app.getHttpServer()).post("/auth/signup").send({ email, password });

            // Login
            const response = await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(200);

            expect(response.body).toHaveProperty("access_token");
        });

        it("should reject invalid credentials", () => {
            return request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    email: "wrong@example.com",
                    password: "WrongPassword123!",
                })
                .expect(401);
        });
    });

    describe("Protected Routes", () => {
        let authToken: string;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post("/auth/signup")
                .send({
                    email: `protected${Date.now()}@example.com`,
                    password: "TestPassword123!",
                });
            authToken = res.body.access_token;
        });

        it("should access /users/me with valid token", () => {
            return request(app.getHttpServer()).get("/users/me").set("Authorization", `Bearer ${authToken}`).expect(200);
        });

        it("should reject /users/me without token", () => {
            return request(app.getHttpServer()).get("/users/me").expect(401);
        });

        it("should list PDFs for authenticated user", () => {
            return request(app.getHttpServer())
                .get("/pdfs")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });
    });
});
