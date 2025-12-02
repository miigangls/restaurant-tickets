import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeApp, cleanupDatabase } from './setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await closeApp(app);
  });

  describe('/auth/register (POST)', () => {
    afterEach(async () => {
      await cleanupDatabase(prisma);
    });
    it('should register a new user', () => {
      const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(typeof res.body.access_token).toBe('string');
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should fail with missing fields', () => {
      const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
        })
        .expect(400);
    });

    it('should fail when email already exists', async () => {
      const duplicateEmail = `duplicate-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: duplicateEmail,
          password: 'password123',
          name: 'First User',
        })
        .expect(201);

      // Second registration with same email
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: duplicateEmail,
        password: 'password123',
        name: 'Second User',
      });

      // Should return 409 Conflict
      expect(response.status).toBe(409);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('/auth/login (POST)', () => {
    let loginEmail: string;

    beforeEach(async () => {
      // Clean database before each test
      await cleanupDatabase(prisma);

      // Use unique email for login tests
      loginEmail = `login-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

      // Create a user for login tests
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: loginEmail,
        password: 'password123',
        name: 'Login User',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('access_token');
    });

    afterEach(async () => {
      await cleanupDatabase(prisma);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer()).post('/auth/login').send({
        email: loginEmail,
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');
    });

    it('should fail with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: loginEmail,
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('should fail with non-existent email', () => {
      const nonexistentEmail = `nonexistent-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: nonexistentEmail,
          password: 'password123',
        })
        .expect(401);
    });

    it('should fail with missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: loginEmail,
        })
        .expect(400);
    });
  });
});
