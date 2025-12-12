import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('PDFs API (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
        await app.init();

        // Create test user and get token
        const res = await request(app.getHttpServer())
            .post('/auth/signup')
            .send({
                email: `pdftest${Date.now()}@example.com`,
                password: 'TestPassword123!',
            });
        authToken = res.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /pdfs', () => {
        it('should return empty array for new user', () => {
            return request(app.getHttpServer())
                .get('/pdfs')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });

        it('should reject unauthenticated request', () => {
            return request(app.getHttpServer())
                .get('/pdfs')
                .expect(401);
        });
    });

    describe('POST /pdfs/chat', () => {
        it('should reject without authentication', () => {
            return request(app.getHttpServer())
                .post('/pdfs/chat')
                .send({
                    message: 'Create 10 questions',
                    pdfId: 'test-id',
                })
                .expect(401);
        });

        it('should reject with invalid pdfId', () => {
            return request(app.getHttpServer())
                .post('/pdfs/chat')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    message: 'Create 10 questions',
                    pdfId: 'non-existent-id',
                })
                .expect(404);
        });

        it('should validate request body', () => {
            return request(app.getHttpServer())
                .post('/pdfs/chat')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    // Missing required fields
                    pdfId: 'test-id',
                })
                .expect(400);
        });
    });
});

describe('Uploads API (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
        await app.init();

        // Create test user
        const res = await request(app.getHttpServer())
            .post('/auth/signup')
            .send({
                email: `uploadtest${Date.now()}@example.com`,
                password: 'TestPassword123!',
            });
        authToken = res.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /uploads/url', () => {
        it('should generate upload URL for authenticated user', () => {
            return request(app.getHttpServer())
                .post('/uploads/url')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    filename: 'test.pdf',
                    contentType: 'application/pdf',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('uploadUrl');
                    expect(res.body).toHaveProperty('pdfId');
                    expect(res.body).toHaveProperty('gcsPath');
                });
        });

        it('should reject unauthenticated request', () => {
            return request(app.getHttpServer())
                .post('/uploads/url')
                .send({
                    filename: 'test.pdf',
                    contentType: 'application/pdf',
                })
                .expect(401);
        });

        it('should validate filename', () => {
            return request(app.getHttpServer())
                .post('/uploads/url')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    // Missing filename
                    contentType: 'application/pdf',
                })
                .expect(400);
        });

        it('should reject non-PDF files', () => {
            return request(app.getHttpServer())
                .post('/uploads/url')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    filename: 'test.txt',
                    contentType: 'text/plain',
                })
                .expect(400);
        });
    });
});

describe('Health Check (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/ (GET) should return 404', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(404);
    });

    it('/api (GET) should return Swagger docs', () => {
        return request(app.getHttpServer())
            .get('/api')
            .expect(200);
    });
});
