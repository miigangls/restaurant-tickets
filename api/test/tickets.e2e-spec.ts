import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeApp, cleanupDatabase } from './setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('Tickets (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanupDatabase(prisma);

    // Use unique email to avoid conflicts in parallel tests
    const uniqueEmail = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

    // Register and login to get auth token
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: uniqueEmail,
      password: 'password123',
      name: 'Admin User',
    });

    if (registerResponse.status !== 201) {
      throw new Error(`Failed to register user: ${JSON.stringify(registerResponse.body)}`);
    }

    authToken = registerResponse.body.access_token;

    if (!authToken) {
      throw new Error('No auth token received from registration');
    }
  });

  afterAll(async () => {
    await closeApp(app);
  });

  afterEach(async () => {
    await prisma.ticket.deleteMany();
  });

  describe('/tickets (GET)', () => {
    it('should return empty array when no tickets exist', () => {
      return request(app.getHttpServer())
        .get('/tickets')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });

    it('should return all active tickets', async () => {
      // Create tickets
      await prisma.ticket.createMany({
        data: [
          {
            title: 'Ticket 1',
            description: 'Description 1',
            price: new Decimal(10.99),
            stock: 100,
            isActive: true,
          },
          {
            title: 'Ticket 2',
            description: 'Description 2',
            price: new Decimal(20.99),
            stock: 50,
            isActive: true,
          },
          {
            title: 'Inactive Ticket',
            description: 'Description 3',
            price: new Decimal(30.99),
            stock: 25,
            isActive: false,
          },
        ],
      });

      return request(app.getHttpServer())
        .get('/tickets')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body.every((ticket: any) => ticket.isActive === true)).toBe(true);
        });
    });
  });

  describe('/tickets/:id (GET)', () => {
    it('should return a ticket by id', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test Description',
          price: new Decimal(15.99),
          stock: 100,
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .get(`/tickets/${ticket.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(ticket.id);
          expect(res.body.title).toBe('Test Ticket');
        });
    });

    it('should return 404 for non-existent ticket', () => {
      return request(app.getHttpServer()).get('/tickets/non-existent-id').expect(404);
    });
  });

  describe('/tickets (POST)', () => {
    it('should create a new ticket with authentication', () => {
      return request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Ticket',
          description: 'New Description',
          price: 25.99,
          stock: 50,
          isActive: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('New Ticket');
          expect(res.body.price).toBe('25.99');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/tickets')
        .send({
          title: 'New Ticket',
          description: 'New Description',
          price: 25.99,
          stock: 50,
        })
        .expect(401);
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '', // Invalid: empty title
          price: -10, // Invalid: negative price
        })
        .expect(400);
    });
  });

  describe('/tickets/:id (PATCH)', () => {
    it('should update a ticket with authentication', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Original Ticket',
          description: 'Original Description',
          price: new Decimal(10.99),
          stock: 100,
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .patch(`/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Ticket',
          price: 15.99,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Ticket');
          expect(res.body.price).toBe('15.99');
        });
    });

    it('should fail without authentication', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test Description',
          price: new Decimal(10.99),
          stock: 100,
          isActive: true,
        },
      });

      return request(app.getHttpServer())
        .patch(`/tickets/${ticket.id}`)
        .send({
          title: 'Updated Ticket',
        })
        .expect(401);
    });
  });

  describe('/tickets/:id (DELETE)', () => {
    it('should soft delete a ticket with authentication', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Ticket to Delete',
          description: 'Description',
          price: new Decimal(10.99),
          stock: 100,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);

      // Verify it's soft deleted
      const deletedTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
      });
      expect(deletedTicket).not.toBeNull();
      expect(deletedTicket.isActive).toBe(false);
    });

    it('should fail without authentication', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          title: 'Test Ticket',
          description: 'Test Description',
          price: new Decimal(10.99),
          stock: 100,
          isActive: true,
        },
      });

      return request(app.getHttpServer()).delete(`/tickets/${ticket.id}`).expect(401);
    });
  });
});
